#!/usr/bin/env python3
"""Final-build data prep — Flame in Freefall (Nov 14, 2026).

Computes every NEW dataset for the final build from the source files in
~/workspace/nasa-challenge/data/ — nothing typed in by hand. Outputs:
  flame-app/data/replay.json    SAME-R raw telemetry traces for exemplar tests
  flame-app/data/wakeup.json    SAME-R time-to-first-response per test x channel
  flame-app/data/extra.json     frontier matrix, O2 x pressure scatter, overlap,
                                honesty counts, response distributions, detector
                                pairing medians, predictor training rows, FLEX
                                burn-time points, PSI-115 PSD curves, PSI-117 rows
  flame-app/data/archive.json   all 2,012 backbone records (Open Archive)
  flame-app/assets/smoke-*.png  PSI-115 smoke stills (+ flow-overlay variants)
Also copies the dataset-release CSVs into flame-app/data/downloads/.
"""
import json, csv, os, glob, shutil, math
import numpy as np

NC = '/home/hatch/workspace/nasa-challenge'
SRC = f'{NC}/data'
APP = f'{NC}/flame-app'
OUT = f'{APP}/data'
os.makedirs(OUT, exist_ok=True)

raw = json.load(open(f'{SRC}/cleaned.json'))
rows = raw['rows']

# ================================================================= replay
by_test = list(csv.DictReader(open(f'{SRC}/samer/samer_detection_by_test.csv')))
for d in by_test:
    d['test_no'] = int(float(d['test_no']))
    for k in ('obsc_drop_med_V', 'smoke_window_scat_med_V', 'smoke_window_ionA_med_V'):
        d[k] = float(d[k])
mat_of = {d['test_no']: d['material'] for d in by_test}

# exemplar tests: strongest Silicone response, Kapton 62 (3-channel lesson),
# Lampwick 82 (scatter saturation)
sil = max((d for d in by_test if d['material'] == 'Silicone'),
          key=lambda d: d['obsc_drop_med_V'])
TARGETS = [sil['test_no'], 62, 82]
print('replay targets:', [(t, mat_of[t]) for t in TARGETS])

hkp_files = sorted(glob.glob(f'{SRC}/samer/PSI-101_Raw Data_HKPData_*.csv'))
series = {t: [] for t in TARGETS}
CH = {'obsc': 'ISSDetectorObscurationMeasurement(Volts)',
      'scat': 'ISSDetectorScatterMeasurement(Volts)',
      'ion': 'IonDetectorAMeasurement(Volts)'}
for f in hkp_files:
    with open(f) as fh:
        for r in csv.DictReader(fh):
            try:
                tn = int(float(r['TestNumber']))
            except (ValueError, KeyError):
                continue
            if tn in series:
                try:
                    series[tn].append((float(r['ElapsedTestTime(Secs)']),
                                       float(r[CH['obsc']]), float(r[CH['scat']]),
                                       float(r[CH['ion']])))
                except (ValueError, KeyError):
                    pass
replay = {'tests': []}
for t in TARGETS:
    pts = sorted(series[t])
    # one row per elapsed second (files are 1 Hz; dedupe overlaps across files)
    seen, uniq = set(), []
    for p in pts:
        if p[0] not in seen:
            seen.add(p[0]); uniq.append(p)
    step = 2 if len(uniq) > 700 else 1
    ds = uniq[::step]
    replay['tests'].append({
        'test_no': t, 'material': mat_of[t],
        'n_samples_raw': len(uniq), 'step_s': step,
        't': [round(p[0]) for p in ds],
        'obsc': [round(p[1], 4) for p in ds],
        'scat': [round(p[2], 4) for p in ds],
        'ion': [round(p[3], 4) for p in ds],
    })
    print(f'  test {t} ({mat_of[t]}): {len(uniq)} raw -> {len(ds)} pts')
json.dump(replay, open(f'{OUT}/replay.json', 'w'))
print('replay.json bytes:', os.path.getsize(f'{OUT}/replay.json'))

# ================================================================= wake-up
# Spec (data-ideas feasibility §2): baseline = median of elapsed < 120 s
# (test 63: earliest 60 samples); 10-s rolling median; thresholds obsc -0.05 V,
# scatter -0.5 V, ion +0.05 V, sustained 10 s; measured from smoke-window start
# (elapsed 200 s); search inside 200-1000 s; 8 STS-config runs excluded.
STS_TESTS = {67, 68, 69, 70, 87, 89, 91, 92}
THR = {'obsc': -0.05, 'scat': -0.5, 'ion': 0.05}
full = {}
for f in hkp_files:
    with open(f) as fh:
        for r in csv.DictReader(fh):
            try:
                tn = int(float(r['TestNumber']))
            except (ValueError, KeyError):
                continue
            if tn == 0 or tn in STS_TESTS:
                continue
            try:
                full.setdefault(tn, []).append(
                    (float(r['ElapsedTestTime(Secs)']), float(r[CH['obsc']]),
                     float(r[CH['scat']]), float(r[CH['ion']])))
            except (ValueError, KeyError):
                pass

def rolling_med(v, w=10):
    out = []
    for i in range(len(v)):
        out.append(float(np.median(v[max(0, i - w + 1):i + 1])))
    return out

def wake_time(el, vals, ci, thr, test_no):
    base_pts = [vals[i][ci] for i in range(len(el)) if el[i] < 120]
    if test_no == 63 or len(base_pts) < 30:
        base_pts = [vals[i][ci] for i in range(min(60, len(vals)))]
    base = float(np.median(base_pts))
    rm = rolling_med([v[ci] for v in vals])
    for i in range(len(el)):
        if el[i] < 200 or el[i] > 1000:
            continue
        dev = rm[i] - base
        crossed = dev <= thr if thr < 0 else dev >= thr
        if crossed:
            ok = True
            for j in range(i, min(i + 10, len(el))):
                d2 = rm[j] - base
                if (d2 <= thr) != (thr < 0) and not (thr < 0 and d2 <= thr) and not (thr > 0 and d2 >= thr):
                    ok = False; break
            if ok:
                return int(el[i] - 200)
    return None

wake = {'tests': [], 'thresholds': {'obsc_V': -0.05, 'scatter_V': -0.5, 'ion_V': 0.05},
        'window_start_s': 200, 'excluded_sts_tests': sorted(STS_TESTS)}
for tn in sorted(full):
    pts = sorted(full[tn])
    seen, el, vals = set(), [], []
    for p in pts:
        if p[0] not in seen:
            seen.add(p[0]); el.append(p[0]); vals.append(p)
    w = {ch: wake_time(el, vals, ci, THR[ch], tn)
         for ci, ch in enumerate(('obsc', 'scat', 'ion'), start=1)}
    wake['tests'].append({'test_no': tn, 'material': mat_of.get(tn, '?'), **w})
json.dump(wake, open(f'{OUT}/wakeup.json', 'w'), indent=1)
anch66 = next(x for x in wake['tests'] if x['test_no'] == 66)
anch62 = next(x for x in wake['tests'] if x['test_no'] == 62)
print('WAKE anchors — test 66 (Silicone):', anch66, '| test 62 (Kapton):', anch62)
print('wake tests:', len(wake['tests']))

# ================================================================= extra
def mid2(r, kmin, kmax):
    lo = r[kmin]; hi = r[kmax] if r[kmax] is not None else lo
    return None if lo is None else (lo + hi) / 2

# --- evidence-frontier matrix: family x O2 band, non-design rows with O2
BANDS = [(0, 15), (15, 20), (20, 25), (25, 30), (30, 40), (40, 60), (60, 101)]
FAMS = ['solid', 'droplet', 'gas', 'aerosol']
matrix = {f: [0] * len(BANDS) for f in FAMS}
for r in rows:
    if r['row_kind'].startswith('design-range'):
        continue
    m = mid2(r, 'o2_pct_min', 'o2_pct_max')
    if m is None or r['material_class'] not in matrix:
        continue
    for bi, (lo, hi) in enumerate(BANDS):
        if lo <= m < hi:
            matrix[r['material_class']][bi] += 1
            break
frontier = {'bands': [f'{lo:g}–{hi if hi <= 100 else 100:g}' for lo, hi in BANDS],
            'families': FAMS, 'counts': matrix,
            'total': sum(sum(v) for v in matrix.values())}
print('frontier total rows with O2 (non-design):', frontier['total'])

# --- condition scatter: O2 x pressure (both recorded), non-design rows
scatter, oxf = [], 0
for r in rows:
    o = mid2(r, 'o2_pct_min', 'o2_pct_max'); p = mid2(r, 'pressure_psi_min', 'pressure_psi_max')
    if o is not None and r['flow_cm_s'] is not None:
        oxf += 1
    if o is not None and p is not None and not r['row_kind'].startswith('design-range'):
        scatter.append([round(o, 2), round(p, 2), r['material_class']])
print('scatter O2xP points:', len(scatter), '| rows with O2+flow both recorded:', oxf)

# --- cross-investigation overlap
inv_of = {}
for r in rows:
    if r['material_canonical']:
        inv_of.setdefault(r['material_canonical'], set()).add(r['accession'])
multi = sorted(([m, sorted(v)] for m, v in inv_of.items() if len(v) >= 2),
               key=lambda x: -len(x[1]))
overlap = {'multi': [{'material': m, 'investigations': v} for m, v in multi],
           'n_multi': len(multi),
           'n_single': sum(1 for v in inv_of.values() if len(v) == 1),
           'n_materials': len(inv_of)}
print('overlap:', overlap['n_multi'], 'multi,', overlap['n_single'], 'single,',
      overlap['n_materials'], 'materials')

# --- archive honesty counts
n_outcome = sum(1 for r in rows if r['outcome'])
kinds = {}
for r in rows:
    k = r['row_kind'].split(' (')[0]
    kinds[k] = kinds.get(k, 0) + 1
honesty = {'total': len(rows), 'with_outcome': n_outcome,
           'pct_with_outcome': round(100 * n_outcome / len(rows), 1), 'kinds': kinds}
print('honesty:', honesty)

# --- response distributions (45 real per-test points; STS-config tests flagged)
dist = {}
for d in by_test:
    dist.setdefault(d['material'], []).append(
        {'test': d['test_no'], 'drop': d['obsc_drop_med_V'],
         'sts': d['test_no'] in STS_TESTS})

# --- detector pairing medians per material (from per-test medians)
pairing = []
for mat in sorted({d['material'] for d in by_test}):
    sel = [d for d in by_test if d['material'] == mat]
    pairing.append({
        'material': mat, 'tests': len(sel),
        'obsc_med': round(float(np.median([d['obsc_drop_med_V'] for d in sel])), 4),
        'scat_med': round(float(np.median([d['smoke_window_scat_med_V'] for d in sel])), 3),
        'ion_med': round(float(np.median([d['smoke_window_ionA_med_V'] for d in sel])), 3)})
print('pairing:', pairing)

# --- predictor training rows (same selection as train_model.py)
train = [{'fuel': r['material_canonical'],
          'o2': round(mid2(r, 'o2_pct_min', 'o2_pct_max'), 2),
          'p': round(mid2(r, 'pressure_psi_min', 'pressure_psi_max'), 2),
          'out': r['outcome']}
         for r in rows if r['accession'] == 'PSI-69'
         and r['material_canonical'] in ('Methanol', 'Heptane')
         and r['o2_pct_min'] is not None and r['pressure_psi_min'] is not None
         and r['outcome']]
print('training rows:', len(train))

# --- FLEX recorded burn times (PSI-69, both fuels)
burn = [{'fuel': r['material_canonical'], 'o2': round(mid2(r, 'o2_pct_min', 'o2_pct_max'), 1),
         'burn_s': r['burn_time_s']}
        for r in rows if r['accession'] == 'PSI-69'
        and r['material_canonical'] in ('Methanol', 'Heptane')
        and r['burn_time_s'] is not None and r['o2_pct_min'] is not None]
burn_bins = []
for fuel in ('Methanol', 'Heptane'):
    for lo, hi in [(12, 18), (18, 24), (24, 30), (30, 34.01)]:
        sel = [b['burn_s'] for b in burn if b['fuel'] == fuel and lo <= b['o2'] < hi]
        if sel:
            burn_bins.append({'fuel': fuel, 'o2_bin': f'{lo:g}–{min(hi, 34):g}',
                              'n': len(sel), 'median_s': round(float(np.median(sel)), 1)})
print('burn points:', len(burn), '| bins:', len(burn_bins))

# --- PSI-115 PSD curves (44 values per file vs the file's node diameters, nm)
diam = np.loadtxt(f'{SRC}/psi115/PSI-115_Analyzed Data_nodeDiameters.dat', skiprows=1)
def psd_vals(case, grav):
    a = np.loadtxt(f'{SRC}/psi115/PSI-115_Analyzed Data_{case}{grav}PSD.dat')
    return a[:, 1].tolist()
psd = {'diameters_nm': [round(float(x) * 1e9, 2) for x in diam[:44]],
       'cases': {}}
for case in ('8cm', '10cm'):
    psd['cases'][case] = {'Earth': psd_vals(case, 'Gravity'), 'Microgravity': psd_vals(case, 'NoGravity')}
print('psd points per curve:', len(psd['diameters_nm']))

# --- PSI-117 tidy extinction rows (93) — model and experiment kept separate
p117 = []
for r in csv.DictReader(open(f'{SRC}/psi117/psi117_extinction_tidy.csv')):
    p117.append({'fuel': r['fuel'], 'p_atm': float(r['pressure_atm']),
                 'dext_cool': float(r['dext_cool']) if r['dext_cool'] else None,
                 'dext_hot': float(r['dext_hot']) if r['dext_hot'] else None,
                 'type': r['value_type'], 'src': r['source_file'].split('_')[-1].replace('.csv', '')})
print('psi117 rows:', len(p117), '| types:', {t: sum(1 for x in p117 if x['type'] == t) for t in ('model', 'experiment')})

extra = {'frontier': frontier, 'scatter_o2p': scatter, 'o2_flow_both': oxf,
         'overlap': overlap, 'honesty': honesty, 'distributions': dist,
         'pairing': pairing, 'training_rows': train, 'burn': burn,
         'burn_bins': burn_bins, 'psd': psd, 'psi117': p117}
json.dump(extra, open(f'{OUT}/extra.json', 'w'))
print('extra.json bytes:', os.path.getsize(f'{OUT}/extra.json'))

# ================================================================= archive
arch = []
for r in rows:
    arch.append({
        'inv': r['investigation'], 'acc': r['accession'], 'doi': r['doi'],
        'table': r['table_file'], 'ref': r['row_ref'],
        'kind': r['row_kind'].split(' (')[0],
        'mat': r['material_canonical'], 'mraw': r['material_raw'],
        'cls': r['material_class'], 'variant': r['material_variant'],
        'o2': None if r['o2_pct_min'] is None else [r['o2_pct_min'], r['o2_pct_max']],
        'o2_approx': r['o2_approx'],
        'p': None if r['pressure_psi_min'] is None else [r['pressure_psi_min'], r['pressure_psi_max']],
        'flow': r['flow_cm_s'], 'out': r['outcome'], 'out_field': r['outcome_field'],
        'burn': r['burn_time_s'], 'fi': r['flames_ignited'],
        'flags': r['flags'], 'notes': r['notes']})
json.dump({'source': 'NASA PSI backbone, 2,012 records, 19 investigations', 'rows': arch},
          open(f'{OUT}/archive.json', 'w'))
print('archive rows:', len(arch), '| archive.json bytes:', os.path.getsize(f'{OUT}/archive.json'))

# ================================================================= PSI-115 stills
# NOTE: matplotlib lives in the system python3 in this environment, not in
# flame-venv. If the import fails, the JSONs above are still complete —
# re-run just this section with the system python3 (as was done for the
# shipped stills) or install matplotlib into the venv.
try:
    import matplotlib
except ImportError:
    print('SKIP stills: matplotlib not importable in this interpreter — '
          'render the PSI-115 stills with system python3 (see BUILD-REPORT).')
    matplotlib = None
if matplotlib is not None:
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
def _render_stills(plt):
    """Exactly what shipped: grids truncated to 230,400 values (240x960),
    shared per-case colour scale, unit-vector flow overlays for both cases."""
    def load_grid(case, grav, var='Smoke'):
        a = np.loadtxt(f'{SRC}/psi115/PSI-115_Analyzed Data_{case}{grav}{var}.dat', skiprows=1)
        return a[:230400].reshape(240, 960)
    for case in ('8cm', '10cm'):
        e, g = load_grid(case, 'Gravity'), load_grid(case, 'NoGravity')
        vmax = max(e.max(), g.max())
        for name, arr in (('earth', e), ('ug', g)):
            fig, ax = plt.subplots(figsize=(9.6, 2.4), dpi=110)
            ax.imshow(arr, cmap='inferno', vmin=0, vmax=vmax, aspect='auto', origin='lower')
            ax.axis('off')
            fig.subplots_adjust(left=0, right=1, top=1, bottom=0)
            fig.savefig(f'{APP}/assets/smoke-{case}-{name}.png', dpi=110)
            plt.close(fig)
        print(f'smoke stills {case}: shared vmax {vmax:.2f}')
        for grav, name in (('Gravity', 'earth'), ('NoGravity', 'ug')):
            s = load_grid(case, grav); u = load_grid(case, grav, 'U'); v = load_grid(case, grav, 'V')
            us, vs = u[::30, ::60], v[::30, ::60]
            mag = np.hypot(us, vs); mag[mag == 0] = 1
            ys, xs = np.mgrid[0:240:30, 0:960:60]
            fig, ax = plt.subplots(figsize=(9.6, 2.4), dpi=110)
            ax.imshow(s, cmap='inferno', vmin=0, vmax=vmax, aspect='auto', origin='lower')
            ax.quiver(xs, ys, us / mag, vs / mag, color='white', alpha=0.6, scale=28, width=0.0028)
            ax.set_xlim(0, 960); ax.set_ylim(0, 240); ax.axis('off')
            fig.subplots_adjust(left=0, right=1, top=1, bottom=0)
            fig.savefig(f'{APP}/assets/smoke-{case}-{name}-flow.png', dpi=110)
            plt.close(fig)
        print(f'flow overlays {case} rendered (unit vectors, direction only)')

if matplotlib is not None:
    _render_stills(plt)

# ================================================================= downloads
dl = f'{OUT}/downloads'
for f in glob.glob(f'{NC}/dataset-release/*.csv') + [f'{NC}/dataset-release/README.md',
                                                     f'{NC}/dataset-release/coverage-verdicts.json']:
    shutil.copy(f, dl)
print('downloads:', sorted(os.listdir(dl)))
print('ALL DONE')
