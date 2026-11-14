'use strict';
/* Flame in Freefall — all logic runs client-side over the JSON files in data/.
   Every number displayed is computed from those files at runtime. */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const mid = r => r ? (r[0] + r[1]) / 2 : null;
const fmt = (x, d = 1) => x === null || x === undefined ? '—' : Number(x).toFixed(d);
let BB = null, INV = null, DET = null, SUP = null, MODEL = null;

/* ---------- navigation ---------- */
function showSec(id) {
  $$('.sec').forEach(s => s.classList.toggle('active', s.id === 'sec-' + id));
  $$('#nav button').forEach(b => b.classList.toggle('active', b.dataset.sec === id));
  if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
  const sec = $('#sec-' + id);
  if (window.gsap && sec) {
    gsap.fromTo(sec.querySelectorAll('.card,.panel,.verdict,.inv-card'),
      { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: .8, ease: 'power2.out', stagger: .05, overwrite: true, clearProps: 'all' });
  }
  window.scrollTo({ top: 0 });
}
$$('#nav button').forEach(b => b.addEventListener('click', () => showSec(b.dataset.sec)));
$$('[data-goto]').forEach(b => b.addEventListener('click', () => showSec(b.dataset.goto)));

/* ---------- generic fills ---------- */
function fill(name, val) { $$('[data-fill="' + name + '"]').forEach(e => e.textContent = val); }

/* ---------- Cabin Check ---------- */
function buildMaterialSelect() {
  const groups = { solid: 'Solid materials', droplet: 'Droplet fuels', gas: 'Gas fuels', aerosol: 'Aerosols' };
  const counts = {};
  BB.rows.forEach(r => { if (r.mat && r.cls !== 'not-a-fuel') counts[r.mat + '|' + r.cls] = (counts[r.mat + '|' + r.cls] || 0) + 1; });
  const sel = $('#cc-material');
  Object.keys(groups).forEach(cls => {
    const mats = Object.keys(counts).filter(k => k.endsWith('|' + cls))
      .sort((a, b) => counts[b] - counts[a]);
    if (!mats.length) return;
    const og = document.createElement('optgroup'); og.label = groups[cls];
    mats.forEach(k => {
      const m = k.split('|')[0];
      const o = document.createElement('option'); o.value = m; o.textContent = `${m} (${counts[k]} row${counts[k] === 1 ? '' : 's'})`;
      og.appendChild(o);
    });
    sel.appendChild(og);
  });
  sel.value = 'PMMA';
}
function rowTable(rows, limit = 8) {
  if (!rows.length) return '';
  const trs = rows.slice(0, limit).map(r =>
    `<tr><td>${r.ref}</td><td>${r.acc}</td><td>${r.o2 ? fmt(mid(r.o2)) + '%' : 'not recorded'}</td>` +
    `<td>${r.p ? fmt(mid(r.p)) : '—'}</td><td>${r.flow !== null ? r.flow : '—'}</td>` +
    `<td>${r.out || 'no outcome recorded'}</td></tr>`).join('');
  return `<table><tr><th>Test row</th><th>Investigation (PSI)</th><th>O₂</th><th>Pressure (psia)</th><th>Flow (cm/s)</th><th>Recorded outcome</th></tr>${trs}</table>` +
    (rows.length > limit ? `<div class="chart-note">Showing ${limit} of ${rows.length} matched rows — all from the NASA PSI backbone.</div>` : '');
}
function cabinCheck(mat, o2, p, flow) {
  /* design-range rows (PSI-68) are a planned test matrix, not tests — never matched */
  const rows = BB.rows.filter(r => r.mat === mat && r.kind !== 'design-range');
  const cond = (r, tol) => {
    if (!r.o2 || Math.abs(mid(r.o2) - o2) > tol) return false;
    if (p !== null && r.p && Math.abs(mid(r.p) - p) > 3) return false;
    if (flow !== null && r.flow !== null && Math.abs(r.flow - flow) > 5) return false;
    return true;
  };
  const matched = rows.filter(r => cond(r, 2));
  const nearby = rows.filter(r => cond(r, 5));
  return { rows, matched, nearby };
}
function runCabin() {
  const mat = $('#cc-material').value;
  const o2 = parseFloat($('#cc-o2').value);
  const pRaw = $('#cc-p').value, fRaw = $('#cc-flow').value;
  const p = pRaw === '' || !isFinite(parseFloat(pRaw)) ? null : parseFloat(pRaw);
  const flow = fRaw === '' || !isFinite(parseFloat(fRaw)) ? null : parseFloat(fRaw);
  const box = $('#cc-result');
  if (!isFinite(o2)) {
    box.innerHTML = `<div class="verdict v-grey"><h3>⬜ Enter a valid O₂ value</h3>
      <p>Oxygen is a required input — without it no honest comparison against the test record is possible.</p></div>`;
    return;
  }
  const { rows, matched, nearby } = cabinCheck(mat, o2, p, flow);
  const o2vals = rows.filter(r => r.o2).map(r => mid(r.o2));
  const rangeTxt = o2vals.length ? `tested O₂ range for this material: ${fmt(Math.min(...o2vals))}% – ${fmt(Math.max(...o2vals))}%`
    : rows.length ? 'this material\u2019s rows record no O₂ level'
    : 'no per-test rows exist for this material — its backbone entries are a planned test-matrix summary, not test records';
  if (!matched.length && !nearby.length) {
    box.innerHTML = `<div class="verdict v-grey"><h3>⬜ NO TEST DATA — ${mat} at ${o2}% O₂</h3>
      <p>No PSI test row for ${mat} comes within ±5 O₂ points of ${o2}% (${rows.length} test rows exist for this material; ${rangeTxt}). This tool will not guess what happens at an untested atmosphere.</p></div>`;
    return;
  }
  if (!matched.length) {
    const near = Math.min(...nearby.map(r => Math.abs(mid(r.o2) - o2)));
    box.innerHTML = `<div class="verdict v-grey"><h3>⬜ NO TEST DATA at these exact conditions — ${mat} at ${o2}% O₂</h3>
      <p>${nearby.length} test row(s) exist nearby (closest ${fmt(near)} O₂ points away), but none within the ±2-point match window. Closest real tests:</p>${rowTable(nearby)}</div>`;
    return;
  }
  const oc = {};
  matched.forEach(r => { if (r.out) oc[r.out] = (oc[r.out] || 0) + 1; });
  const ocKeys = Object.keys(oc);
  const flexVocab = ocKeys.every(k => ['Extinction', 'Disruption', 'Completion'].includes(k));
  let cls, head, body;
  if (ocKeys.length && flexVocab) {
    const ext = oc['Extinction'] || 0, tot = ocKeys.reduce((a, k) => a + oc[k], 0);
    const share = ext / tot;
    cls = share >= 0.8 ? 'v-green' : share >= 0.4 ? 'v-yellow' : 'v-red';
    head = share >= 0.8 ? 'Flames went out in most matched tests' :
           share >= 0.4 ? 'Mixed outcomes in matched tests' : 'Flames usually did NOT go out in matched tests';
    body = `<p>${matched.length} real test row${matched.length === 1 ? '' : 's'} match ${mat} at ${o2}% O₂. Of the ${tot} with a recorded test end: <strong>${ext} ended in Extinction</strong>` +
      (oc['Disruption'] ? `, ${oc['Disruption']} in Disruption` : '') + (oc['Completion'] ? `, ${oc['Completion']} burned to Completion` : '') + `.</p>`;
  } else if (ocKeys.length) {
    cls = 'v-yellow';
    head = 'Tested at these conditions — outcomes recorded as codes';
    body = `<p>${matched.length} real test row${matched.length === 1 ? '' : 's'} match. Recorded outcome codes: ${ocKeys.map(k => `${k} × ${oc[k]}`).join(', ')} — shown exactly as recorded in the PSI table; this tool does not reinterpret codes it cannot define from the data.</p>`;
  } else {
    cls = 'v-yellow';
    head = 'Tested at these conditions — coverage only';
    body = `<p>${matched.length} real test row${matched.length === 1 ? '' : 's'} match ${mat} at ${o2}% O₂ — so this atmosphere <strong>has</strong> been tested for this material. But the PSI tables for these investigations record test conditions, not burn outcomes, so no burn/extinction verdict can honestly be drawn. (${rangeTxt}.)</p>`;
  }
  box.innerHTML = `<div class="verdict ${cls}"><h3>${head}</h3>${body}${rowTable(matched)}</div>`;
}
$$('.preset[data-o2]').forEach(b => { if (b.closest('#sec-cabin')) b.addEventListener('click', () => { $('#cc-o2').value = b.dataset.o2; $('#cc-p').value = b.dataset.p; runCabin(); }); });

/* ---------- Inventory Screener ---------- */
const PRESETS = [
  { name: 'ISS cabin', o2: 21, p: 14.7 },
  { name: 'Moon exploration', o2: 34, p: 8.2 },
  { name: 'Spacesuit', o2: 100, p: 4.3 },
];
function matchMaterial(name) {
  const mats = [...new Set(BB.rows.map(r => r.mat).filter(Boolean))];
  const exact = mats.find(m => m.toLowerCase() === name.toLowerCase());
  if (exact) return exact;
  /* substring matching only for names of 3+ chars — a 1–2 letter fragment matches arbitrary materials */
  if (name.trim().length < 3) return null;
  return mats.find(m => m.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(m.toLowerCase())) || null;
}
function screenStatus(mat, preset) {
  const rows = BB.rows.filter(r => r.mat === mat && r.o2 && r.kind !== 'design-range');
  if (!rows.length) return { chip: 'grey', label: 'NO O₂ DATA', detail: 'test rows record no O₂ level' };
  let best = null, bd = 1e9;
  rows.forEach(r => { const d = Math.abs(mid(r.o2) - preset.o2); if (d < bd) { bd = d; best = mid(r.o2); } });
  const mx = Math.max(...rows.map(r => mid(r.o2))), mn = Math.min(...rows.map(r => mid(r.o2)));
  const detail = `nearest test at ${fmt(best)}% O₂ · tested range ${fmt(mn)}–${fmt(mx)}%`;
  if (bd <= 1) return { chip: 'green', label: 'TESTED', detail };
  if (bd <= 4) return { chip: 'yellow', label: 'NEARBY ONLY', detail };
  return { chip: 'red', label: 'GAP', detail };
}
function runScreener() {
  const lines = $('#sc-input').value.split('\n').map(s => s.trim()).filter(Boolean);
  let html = '<table><tr><th>Material (as typed → matched)</th>' + PRESETS.map(p => `<th>${p.name}<br>${p.o2}% O₂ · ${p.p} psia</th>`).join('') + '</tr>';
  lines.forEach(line => {
    let m = matchMaterial(line);
    /* a material whose only backbone rows are a planned test matrix has no test rows under its name */
    if (m && !BB.rows.some(r => r.mat === m && r.kind !== 'design-range')) m = null;
    if (!m) { html += `<tr><td>${line}</td>` + PRESETS.map(() => `<td><span class="chip grey">NOT IN PSI DATA</span></td>`).join('') + '</tr>'; return; }
    html += `<tr><td><b>${m}</b>${m.toLowerCase() !== line.toLowerCase() ? ` <span style="color:var(--muted)">(typed: ${line})</span>` : ''}</td>` +
      PRESETS.map(p => { const s = screenStatus(m, p); return `<td><span class="chip ${s.chip}">${s.label}</span><div class="chart-note">${s.detail}</div></td>`; }).join('') + '</tr>';
  });
  $('#sc-result').innerHTML = html + '</table>';
}

/* ---------- Detection ---------- */
function barRow(label, val, maxVal, color, valTxt, scale = 'linear') {
  const f = scale === 'sqrt' ? Math.sqrt(val / maxVal) : val / maxVal;
  return `<div class="bar-row"><div>${label}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(f * 100, 0.7)}%;background:${color}"></div></div><div class="bar-val">${valTxt}</div></div>`;
}
function renderDetection() {
  const mats = [...DET.by_material].sort((a, b) => b.obsc_drop_med_V - a.obsc_drop_med_V);
  $('#det-chart').innerHTML = mats.map(m => {
    const v = m.obsc_drop_med_V;
    const color = v >= 0.15 ? 'var(--green)' : v >= 0.01 ? 'var(--yellow)' : 'var(--red)';
    return barRow(m.material, v, 0.2997, color, v.toFixed(3) + ' V', 'sqrt');
  }).join('') + '<div class="chart-note">Bars use a square-root scale so 0.001 V and 0.30 V are both visible; the printed values are exact.</div>';
  $('#det-mat-table').innerHTML = '<table><tr><th>Material</th><th>Tests</th><th>Median drop (V)</th><th>Range (V)</th><th>Window below 3.30 V (median %)</th><th>Ion channel median (V)</th></tr>' +
    mats.map(m => `<tr><td><b>${m.material}</b></td><td>${m.tests}</td><td>${m.obsc_drop_med_V.toFixed(3)}</td><td>${m.obsc_drop_min_V.toFixed(3)} – ${m.obsc_drop_max_V.toFixed(3)}</td><td>${m.pct_below_3p30_med}</td><td>${m.ionA_med_V}</td></tr>`).join('') + '</table>';
  const cases = ['8cm', '10cm'];
  $('#psi115-chart').innerHTML = cases.map(c => {
    const e = DET.psi115_smoke[c]['Earth'], g = DET.psi115_smoke[c]['Microgravity'];
    return `<div style="margin:10px 0"><b>${c} case — peak smoke</b>` +
      barRow('Earth', e.max, 14.18, '#7cc4ff', e.max.toFixed(2)) +
      barRow('Microgravity', g.max, 14.18, 'var(--accent)', g.max.toFixed(2)) + '</div>';
  }).join('');
  $('#psi115-table').innerHTML = '<table><tr><th>Case</th><th>Gravity</th><th>Peak smoke</th><th>Mean smoke</th><th>Cells containing smoke</th></tr>' +
    cases.flatMap(c => ['Earth', 'Microgravity'].map(g => {
      const d = DET.psi115_smoke[c][g];
      return `<tr><td>${c}</td><td>${g}</td><td>${d.max.toFixed(2)}</td><td>${d.mean.toFixed(3)}</td><td>${d.pct_cells_with_smoke.toFixed(1)}%</td></tr>`;
    })).join('') + '</table>';
  $('#det-test-table').innerHTML = '<table><tr><th>Test</th><th>Material</th><th>Obscuration drop (V)</th><th>Scatter median (V)</th><th>Ion median (V)</th><th>Response</th></tr>' +
    DET.by_test.map(t => `<tr><td>${t.test_no}</td><td>${t.material}</td><td>${t.obsc_drop_med_V.toFixed(3)}</td><td>${t.smoke_window_scat_med_V.toFixed(2)}</td><td>${t.smoke_window_ionA_med_V.toFixed(3)}</td><td>${t.obsc_drop_med_V < 0.005 ? '<span class="chip red">NONE</span>' : t.obsc_drop_med_V >= 0.15 ? '<span class="chip green">STRONG</span>' : '<span class="chip yellow">WEAK</span>'}</td></tr>`).join('') + '</table>';
}

/* ---------- Suppression ---------- */
function supMatch(fuel, o2, p) {
  return BB.rows.filter(r => r.acc === 'PSI-69' && r.mat === fuel && r.o2 && r.p &&
    Math.abs(mid(r.o2) - o2) <= 3 && Math.abs(mid(r.p) - p) <= 5);
}
function runSuppression() {
  const fuel = $('#sup-fuel').value, o2 = parseFloat($('#sup-o2').value), p = parseFloat($('#sup-p').value);
  const box = $('#sup-result');
  if (!isFinite(o2) || !isFinite(p)) {
    box.innerHTML = `<div class="verdict v-grey"><h3>⬜ Enter valid O₂ and pressure values</h3><p>Both are required inputs — without them no honest match against the test record is possible.</p></div>`;
    return;
  }
  const m = supMatch(fuel, o2, p);
  if (!m.length) {
    box.innerHTML = `<div class="verdict v-grey"><h3>⬜ NO MATCHED TEST ROWS</h3><p>No FLEX test with ${fuel} ran within ±3 O₂ points and ±5 psia of ${o2}% / ${p} psia. No recommendation is made — widen the conditions toward the tested envelope (O₂ 12–34%, 10.2–44.9 psia) to find real evidence.</p></div>`;
    return;
  }
  const ext = m.filter(r => r.out === 'Extinction').length;
  const share = Math.round(ext / m.length * 100);
  box.innerHTML = `<div class="verdict ${share >= 60 ? 'v-green' : share >= 30 ? 'v-yellow' : 'v-red'}">
    <h3>Based on ${m.length} real FLEX test row${m.length === 1 ? '' : 's'}: ${ext} of ${m.length} flames went out (${share}%)</h3>
    <p>${fuel} droplets at ${o2}% O₂ / ${p} psia (±3 O₂, ±5 psia window). ` +
    (share >= 60 ? 'At these conditions, most tested flames extinguished before burning through.' :
     share >= 30 ? 'At these conditions, extinction was inconsistent — roughly a coin toss in the test record.' :
     'At these conditions, most tested flames did NOT go out on their own — active suppression would be essential.') +
    `</p>${rowTable(m, 6)}</div>`;
}
function renderSupChart() {
  const fuels = ['Methanol', 'Heptane'];
  $('#sup-chart').innerHTML = fuels.map(f => {
    const bins = SUP.flex_extinction_by_o2.filter(b => b.fuel === f);
    return `<div style="margin:12px 0"><b>${f}</b>` + bins.map(b =>
      barRow(b.o2_bin + '% O₂', b.share, 1, b.share >= 0.6 ? 'var(--green)' : b.share >= 0.3 ? 'var(--yellow)' : 'var(--red)',
        Math.round(b.share * 100) + '% · n=' + b.n)).join('') + '</div>';
  }).join('');
}

/* ---------- Safe Predictor ---------- */
function predict(fuel, o2, p) {
  const env = MODEL.envelope;
  if (!isFinite(o2) || !isFinite(p)) return { abstain: 'a numeric O₂ and pressure are required' };
  if (!env.fuels.includes(fuel)) return { abstain: `fuel “${fuel}” was never in the training tests (only ${env.fuels.join(' and ')})` };
  if (o2 < env.o2[0] || o2 > env.o2[1]) return { abstain: `O₂ ${o2}% is outside the tested range ${env.o2[0]}–${env.o2[1]}%` };
  if (p < env.pressure_psi[0] || p > env.pressure_psi[1]) return { abstain: `pressure ${p} psia is outside the tested range ${fmt(env.pressure_psi[0])}–${fmt(env.pressure_psi[1])} psia` };
  const vals = { fuel: fuel === 'Heptane' ? 1 : 0, o2, pressure: p };
  const names = { fuel: 'fuel is Heptane', o2: 'O₂', pressure: 'pressure' };
  let node = MODEL.tree, path = [];
  while (node.feature) {
    const v = vals[node.feature];
    const goLeft = v <= node.threshold;
    if (node.feature === 'fuel') path.push(goLeft ? 'fuel = Methanol' : 'fuel = Heptane');
    else path.push(`${names[node.feature]} ${goLeft ? '≤' : '>'} ${node.threshold}${node.feature === 'o2' ? '%' : ' psia'}`);
    node = goLeft ? node.left : node.right;
  }
  return { prediction: node.prediction, proba: node.proba_extinction, n: node.n, counts: node.counts, path };
}
function runPredictor() {
  const fuel = $('#pr-fuel').value, o2 = parseFloat($('#pr-o2').value), p = parseFloat($('#pr-p').value);
  const box = $('#pr-result');
  if (!isFinite(o2) || !isFinite(p)) {
    box.innerHTML = `<div class="verdict v-grey"><h3>⬜ Enter valid O₂ and pressure values</h3><p>Both are required inputs — the model cannot be queried with a missing number.</p></div>`;
    return;
  }
  const r = predict(fuel, o2, p);
  if (r.abstain) {
    box.innerHTML = `<div class="verdict v-grey"><h3>⬜ NO PREDICTION — outside tested data</h3><p>The model refuses: ${r.abstain}. Guessing here is exactly how a fire tool becomes dangerous, so it abstains. Bring the inputs inside the tested envelope to get an answer.</p></div>`;
    return;
  }
  const ext = r.prediction === 'Extinction';
  box.innerHTML = `<div class="verdict ${ext ? 'v-green' : 'v-red'}"><h3>${ext ? '🟢 Prediction: flame goes OUT (Extinction)' : '🔴 Prediction: flame does NOT go out'}</h3>
    <p>For ${fuel} at ${o2}% O₂ / ${p} psia, the tree lands in a leaf holding ${r.n} real training tests, of which ${r.counts[1]} ended in Extinction (${Math.round(r.proba * 100)}%).</p>
    <div class="path">Decision path: ${r.path.join('  →  ')}</div></div>`;
}
function renderValidation() {
  const v = MODEL.validation;
  $('#pr-validation').innerHTML = `<div class="kv">
    <div><b>${(v.holdout_accuracy * 100).toFixed(1)}%</b><span>holdout accuracy (${v.n_holdout} unseen tests)</span></div>
    <div><b>${(v.majority_baseline_accuracy * 100).toFixed(1)}%</b><span>“always say Extinction” baseline</span></div>
    <div><b>${MODEL.n_rows}</b><span>training rows (PSI-69 FLEX)</span></div>
    <div><b>${v.gate_abstained_on_holdout}</b><span>gate abstentions on holdout*</span></div></div>
    <p>Confusion on holdout: correctly predicted Extinction ${v.confusion.tp_extinction} · wrongly predicted Extinction ${v.confusion.fp_extinction} · correctly predicted No-extinction ${v.confusion.tn} · missed Extinction ${v.confusion.fn}. The model is modest — it beats the baseline by ~7 points, and we say so. *Holdout tests come from inside the same tested envelope, so the gate rarely fires there; it exists for inputs beyond the tested ranges, like O₂ 60%.</p>`;
}

/* ---------- Investigation cards ---------- */
let cardFamily = 'all';
function outcomeTxt(c) {
  if (!c.outcomes) return 'No outcome column in PSI table';
  return Object.entries(c.outcomes).map(([k, n]) => `${k} × ${n}`).join(' · ');
}
function renderCards() {
  const q = $('#card-search').value.trim().toLowerCase();
  const list = INV.filter(c => (cardFamily === 'all' || c.family === cardFamily) &&
    (!q || (c.name + ' ' + c.accession + ' ' + c.materials.join(' ')).toLowerCase().includes(q)));
  $('#cards-grid').innerHTML = list.map(c => `<div class="inv-card">
    <div class="inv-top"><span class="acc-badge">${c.accession}</span><span class="fam">${c.family_label}</span></div>
    <h3>${c.name}</h3>
    <div class="inv-rows">
      <div>Test rows<br><b>${c.n_rows}</b></div>
      <div>Tested O₂<br><b>${c.o2_range ? fmt(c.o2_range[0]) + '–' + fmt(c.o2_range[1]) + '%' : 'not recorded'}</b></div>
      <div>Pressure<br><b>${c.pressure_range_psi ? c.pressure_range_psi[0] + '–' + c.pressure_range_psi[1] + ' psia' : 'not recorded'}</b></div>
      <div>Materials<br><b>${c.materials.slice(0, 2).join(', ') || '—'}</b></div>
    </div>
    <p style="font-size:13px;color:#cfdae4;margin:4px 0">Outcomes: ${outcomeTxt(c)}</p>
    ${c.note ? `<p style="font-size:13px;color:var(--yellow);margin:4px 0">${c.note}</p>` : ''}
    <div class="src">DOI: <a href="https://doi.org/${c.doi}" target="_blank" rel="noopener">${c.doi}</a> · via NASA PSI</div>
  </div>`).join('');
  $('#cards-empty').innerHTML = list.length ? '' : '<div class="empty-note">No investigation matches that search/filter.</div>';
  if (window.gsap) gsap.fromTo('#cards-grid .inv-card', { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .6, ease: 'power2.out', stagger: .03, overwrite: true, clearProps: 'all' });
}
$$('#card-filters .preset').forEach(b => b.addEventListener('click', () => {
  $$('#card-filters .preset').forEach(x => x.classList.remove('active'));
  b.classList.add('active'); cardFamily = b.dataset.family; renderCards();
}));
$('#card-search').addEventListener('input', renderCards);

/* ---------- References datasets table ---------- */
function renderRefs() {
  $('#refs-datasets').innerHTML = '<table><tr><th>PSI accession</th><th>Investigation</th><th>Rows used</th><th>DOI</th></tr>' +
    INV.map(c => `<tr><td>${c.accession}</td><td>${c.name}</td><td>${c.n_rows}</td><td><a href="https://doi.org/${c.doi}" target="_blank" rel="noopener">${c.doi}</a></td></tr>`).join('') + '</table>';
}

/* ---------- home counters ---------- */
function runCounters() {
  $$('.counter').forEach(el => {
    const target = parseFloat(el.dataset.target), dec = parseInt(el.dataset.decimals || '0');
    if (window.gsap) {
      const obj = { v: 0 };
      gsap.to(obj, { v: target, duration: 1.15, ease: 'power2.out', onUpdate: () => el.textContent = obj.v.toFixed(dec) });
    } else el.textContent = target.toFixed(dec);
  });
}

/* ---------- init ---------- */
async function init() {
  const [bb, inv, det, sup, model] = await Promise.all(
    ['data/backbone.json', 'data/investigations.json', 'data/detection.json', 'data/suppression.json', 'data/model.json']
      .map(u => fetch(u).then(r => r.json())));
  BB = bb; INV = inv; DET = det; SUP = sup; MODEL = model;
  fill('solids-o2-rows', DET.headlines.solids_o2_rows);
  fill('no-response', DET.headlines.samer_tests_no_response);
  fill('tests-analysed', DET.headlines.samer_tests_analysed);
  fill('flex-n', SUP.flex_total_rows_with_outcome);
  fill('bass-n', SUP.bass.n_rows);
  fill('bass-mats', SUP.bass.materials.join(', '));
  fill('bass-o2', SUP.bass.o2_range ? SUP.bass.o2_range[0] + '–' + SUP.bass.o2_range[1] + '%' : 'not recorded');
  fill('env-o2', MODEL.envelope.o2[0] + '–' + MODEL.envelope.o2[1] + '%');
  fill('env-p', fmt(MODEL.envelope.pressure_psi[0]) + '–' + fmt(MODEL.envelope.pressure_psi[1]));
  buildMaterialSelect();
  renderDetection(); renderSupChart(); renderValidation(); renderCards(); renderRefs();
  runCabin(); runScreener(); runSuppression(); runPredictor();
  $('#cc-run').addEventListener('click', runCabin);
  $('#sc-run').addEventListener('click', runScreener);
  $('#sup-run').addEventListener('click', runSuppression);
  $('#pr-run').addEventListener('click', runPredictor);
  runCounters();
  const start = (location.hash || '#home').slice(1);
  if (document.getElementById('sec-' + start)) showSec(start);
  if (new URLSearchParams(location.search).has('selftest')) selfTest();
}
function selfTest() {
  const out = [];
  const t = (name, ok, extra = '') => out.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`);
  t('backbone rows == 2012', BB.rows.length === 2012, `(${BB.rows.length})`);
  t('cards == 19', INV.length === 19, `(${INV.length})`);
  const cc1 = cabinCheck('PMMA', 21, 14.7, null);
  t('CabinCheck PMMA@21% matched > 0', cc1.matched.length > 0, `(${cc1.matched.length})`);
  const cc2 = cabinCheck('PMMA', 34, 8.2, null);
  t('CabinCheck PMMA@34% matched == 0 (gap)', cc2.matched.length === 0, `(${cc2.matched.length})`);
  const p1 = predict('Methanol', 21, 14.7);
  t('Predictor inside envelope answers', !!p1.prediction, `(${p1.prediction || p1.abstain})`);
  const p2 = predict('Methanol', 60, 14.7);
  t('Predictor O2=60 abstains', !!p2.abstain, `(${p2.abstain || 'NO ABSTAIN!'})`);
  const p3 = predict('Ethanol', 21, 14.7);
  t('Predictor unknown fuel abstains', !!p3.abstain, '');
  const s1 = screenStatus('PMMA', PRESETS[1]);
  t('Screener PMMA@Moon == GAP', s1.label === 'GAP', `(${s1.label})`);
  const s2 = screenStatus('PMMA', PRESETS[0]);
  t('Screener PMMA@ISS == TESTED', s2.label === 'TESTED', `(${s2.label})`);
  const sm = supMatch('Methanol', 21, 14.7);
  t('Suppression match Methanol@21 > 0', sm.length > 0, `(${sm.length})`);
  const el = $('#selftest');
  el.style.display = 'block';
  el.innerHTML = '<pre>' + out.join('\n') + '</pre>';
  document.title = 'SELFTEST DONE';
}
init().catch(e => { document.body.insertAdjacentHTML('afterbegin', '<div style="padding:14px;background:#5b1a1a;color:#fff">Failed to load data files: ' + e.message + ' — serve this folder over HTTP (e.g. python3 -m http.server) rather than file://.</div>'); });
