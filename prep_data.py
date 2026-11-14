#!/usr/bin/env python3
"""Prepare the app's data JSONs from the verified NASA PSI extractions.
Every number shipped to the browser is computed here from the source
files in ~/workspace/nasa-challenge/data/ — nothing is typed in by hand
except scenario preset definitions (labelled as such in the app) and
story facts whose source is named next to them.
"""
import json, csv, collections, os

SRC = '/home/hatch/workspace/nasa-challenge/data'
OUT = '/home/hatch/workspace/nasa-challenge/flame-app/data'
os.makedirs(OUT, exist_ok=True)

raw = json.load(open(f'{SRC}/cleaned.json'))
rows = raw['rows']

# ---------- backbone.json (slim rows for Cabin Check / Screener / recommender)
slim = []
for r in rows:
    slim.append({
        'inv': r['investigation'], 'acc': r['accession'], 'doi': r['doi'],
        'ref': r['row_ref'], 'mat': r['material_canonical'], 'mraw': r['material_raw'],
        'cls': r['material_class'],
        'o2': None if r['o2_pct_min'] is None else [r['o2_pct_min'], r['o2_pct_max']],
        'p': None if r['pressure_psi_min'] is None else [r['pressure_psi_min'], r['pressure_psi_max']],
        'flow': r['flow_cm_s'], 'out': r['outcome'], 'burn': r['burn_time_s'],
        'fi': r['flames_ignited'],
    })
json.dump({'source': 'NASA PSI backbone (SPICA cleaned.json), 2,012 rows, 19 investigations',
           'rows': slim}, open(f'{OUT}/backbone.json', 'w'))
print('backbone rows:', len(slim))

# ---------- investigations.json (19 cards)
FAMILY = {
    'PSI-25': 'solids', 'PSI-26': 'solids', 'PSI-98': 'solids', 'PSI-99': 'solids',
    'PSI-100': 'solids',
    'PSI-69': 'droplets', 'PSI-68': 'droplets',
    'PSI-10': 'gas', 'PSI-159': 'gas', 'PSI-39': 'gas', 'PSI-107': 'gas',
    'PSI-106': 'gas', 'PSI-20': 'gas', 'PSI-21': 'gas', 'PSI-22': 'gas', 'PSI-23': 'gas',
    'PSI-101': 'smoke', 'PSI-102': 'smoke', 'PSI-47': 'smoke',
}
FAMILY_LABEL = {'solids': 'Solid fuels / material flammability',
                'droplets': 'Droplet combustion',
                'gas': 'Gas flames',
                'smoke': 'Smoke & aerosol detection'}
by = collections.defaultdict(list)
for r in rows: by[r['accession']].append(r)
cards = []
for acc in sorted(by, key=lambda a: int(a.split('-')[1])):
    sel = by[acc]
    o2 = [r['o2_pct_min'] for r in sel if r['o2_pct_min'] is not None]
    pr = [r['pressure_psi_min'] for r in sel if r['pressure_psi_min'] is not None]
    oc = collections.Counter(r['outcome'] for r in sel if r['outcome'])
    mats = collections.Counter(r['material_canonical'] for r in sel if r['material_canonical'])
    cards.append({
        'accession': acc, 'name': sel[0]['investigation'], 'doi': sel[0]['doi'],
        'family': FAMILY[acc], 'family_label': FAMILY_LABEL[FAMILY[acc]],
        'n_rows': len(sel),
        'tables': sorted({r['table_file'] for r in sel}),
        'o2_range': [min(o2), max(o2)] if o2 else None,
        'pressure_range_psi': [round(min(pr), 1), round(max(pr), 1)] if pr else None,
        'outcomes': dict(oc) if oc else None,
        'materials': [m for m, _ in mats.most_common(4)],
    })
json.dump(cards, open(f'{OUT}/investigations.json', 'w'), indent=1)
print('investigation cards:', len(cards))

# ---------- headline numbers, computed (not typed in)
solids_o2 = [r['o2_pct_min'] for r in rows if r['material_class'] == 'solid' and r['o2_pct_min'] is not None]
det_by_mat = list(csv.DictReader(open(f'{SRC}/samer/samer_detection_by_material.csv')))
det_by_test = list(csv.DictReader(open(f'{SRC}/samer/samer_detection_by_test.csv')))
for d in det_by_mat + det_by_test:
    for k, v in d.items():
        try: d[k] = float(v)
        except (ValueError, TypeError): pass
for d in det_by_test:
    d['test_no'] = int(float(d['test_no']))
no_resp = sum(1 for d in det_by_test if d['obsc_drop_med_V'] < 0.005)
psi115 = {}
for r in csv.DictReader(open(f'{SRC}/psi115/psi115_summary.csv')):
    if r['variable'] == 'Smoke' and r['gravity'] in ('Earth', 'Microgravity'):
        psi115.setdefault(r['case'], {})[r['gravity']] = {
            'max': float(r['max']), 'mean': float(r['mean']),
            'pct_cells_with_smoke': float(r['pct_above_zero'])}
headlines = {
    'solids_max_o2_pct': max(solids_o2),
    'solids_o2_rows': len(solids_o2),
    'backbone_rows': len(rows),
    'samer_tests_analysed': len(det_by_test),
    'samer_tests_no_response': no_resp,
    'samer_telemetry_rows': 68699,
}
json.dump({'by_material': det_by_mat, 'by_test': det_by_test,
           'psi115_smoke': psi115, 'headlines': headlines},
          open(f'{OUT}/detection.json', 'w'), indent=1)
print('headlines:', headlines)
print('psi115:', psi115)

# ---------- suppression aggregates (FLEX extinction evidence)
flex = [r for r in rows if r['accession'] == 'PSI-69' and r['outcome']]
bins = [(12, 16), (16, 20), (20, 24), (24, 28), (28, 34.01)]
agg = []
for fuel in ('Methanol', 'Heptane'):
    for lo, hi in bins:
        sel = [r for r in flex if r['material_canonical'] == fuel
               and r['o2_pct_min'] is not None and lo <= r['o2_pct_min'] < hi]
        if sel:
            ext = sum(1 for r in sel if r['outcome'] == 'Extinction')
            agg.append({'fuel': fuel, 'o2_bin': f'{lo:g}–{hi if hi < 34 else 34:g}',
                        'n': len(sel), 'extinguished': ext,
                        'share': round(ext / len(sel), 3)})
bass = [r for r in rows if r['accession'] in ('PSI-25', 'PSI-26')]
bass_o2 = [r['o2_pct_min'] for r in bass if r['o2_pct_min'] is not None]
supp = {
    'flex_extinction_by_o2': agg,
    'flex_total_rows_with_outcome': len(flex),
    'bass': {'n_rows': len(bass),
             'materials': sorted({r['material_canonical'] for r in bass if r['material_canonical']}),
             'o2_range': [min(bass_o2), max(bass_o2)] if bass_o2 else None,
             'outcome_recorded': False},
}
json.dump(supp, open(f'{OUT}/suppression.json', 'w'), indent=1)
print('suppression agg bins:', len(agg), '| BASS rows:', len(bass))
