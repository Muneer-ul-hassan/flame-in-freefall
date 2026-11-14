'use strict';
/* Flame in Freefall — all logic runs client-side over the JSON files in data/.
   Every number displayed is computed from those files at runtime. */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const mid = r => r ? (r[0] + r[1]) / 2 : null;
const fmt = (x, d = 1) => x === null || x === undefined ? '—' : Number(x).toFixed(d);
let BB = null, INV = null, DET = null, SUP = null, MODEL = null;
let REPLAY = null, WAKE = null, EXTRA = null, ARCH = null;

/* ---------- navigation ---------- */
function showSec(id) {
  $$('.sec').forEach(s => s.classList.toggle('active', s.id === 'sec-' + id));
  $$('#nav button').forEach(b => b.classList.toggle('active', b.dataset.sec === id));
  if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
  const sec = $('#sec-' + id);
  if (window.gsap && sec) {
    /* transform-only entrance: content is NEVER left invisible if a tween
       is interrupted — opacity stays 1 throughout (final-build hardening). */
    gsap.fromTo(sec.querySelectorAll('.card,.panel,.verdict,.inv-card'),
      { y: 16 }, { y: 0, duration: .8, ease: 'power2.out', stagger: .05, overwrite: true, clearProps: 'all' });
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
  return `<div class="scroll-table"><table><tr><th>Test row</th><th>Investigation (PSI)</th><th>O₂</th><th>Pressure (psia)</th><th>Flow (cm/s)</th><th>Recorded outcome</th></tr>${trs}</table></div>` +
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
      <p>No PSI test row for ${mat} comes within ±5 O₂ points of ${o2}% (${rows.length} test rows exist for this material; ${rangeTxt}). This tool will not guess what happens at an untested atmosphere.</p></div>` +
      experimentCard(mat, o2, p, flow, rows);
    return;
  }
  if (!matched.length) {
    const near = Math.min(...nearby.map(r => Math.abs(mid(r.o2) - o2)));
    box.innerHTML = `<div class="verdict v-grey"><h3>⬜ NO TEST DATA at these exact conditions — ${mat} at ${o2}% O₂</h3>
      <p>${nearby.length} test row(s) exist nearby (closest ${fmt(near)} O₂ points away), but none within the ±2-point match window. Closest real tests:</p>${rowTable(nearby)}</div>` +
      experimentCard(mat, o2, p, flow, rows);
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
  if (!lines.length) {
    $('#sc-result').innerHTML = '<div class="empty-note">Nothing to screen — paste one material per line above (or use the pre-filled examples), then press “Screen this inventory”.</div>';
    return;
  }
  const gaps = [];
  let html = '<table><tr><th>Material (as typed → matched)</th>' + PRESETS.map(p => `<th>${p.name}<br>${p.o2}% O₂ · ${p.p} psia</th>`).join('') + '</tr>';
  lines.forEach(line => {
    let m = matchMaterial(line);
    /* a material whose only backbone rows are a planned test matrix has no test rows under its name */
    if (m && !BB.rows.some(r => r.mat === m && r.kind !== 'design-range')) m = null;
    if (!m) { html += `<tr><td>${line}</td>` + PRESETS.map(() => `<td><span class="chip grey">NOT IN PSI DATA</span></td>`).join('') + '</tr>'; return; }
    html += `<tr><td><b>${m}</b>${m.toLowerCase() !== line.toLowerCase() ? ` <span style="color:var(--muted)">(typed: ${line})</span>` : ''}</td>` +
      PRESETS.map(p => { const s = screenStatus(m, p); if (s.label === 'GAP') gaps.push({ mat: m, preset: p }); return `<td><span class="chip ${s.chip}">${s.label}</span><div class="chart-note">${s.detail}</div></td>`; }).join('') + '</tr>';
  });
  html += '</table>';
  if (gaps.length) {
    html += `<div class="card wide exp-card"><h3>🔬 The experiments that would settle these gaps</h3>` +
      gaps.map(g => `<p><strong>${g.mat} at the ${g.preset.name} atmosphere (${g.preset.o2}% O₂ / ${g.preset.p} psia)</strong> — no test row exists near these conditions. One test series of ${g.mat} at ${g.preset.o2}% O₂, extending the investigations that already own this material, would turn this GAP into evidence. Until it is run, the honest verdict stays GAP.</p>`).join('') + '</div>';
  }
  $('#sc-result').innerHTML = html;
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
    box.innerHTML = `<div class="verdict v-grey"><h3>⬜ NO MATCHED TEST ROWS</h3><p>No FLEX test with ${fuel} ran within ±3 O₂ points and ±5 psia of ${o2}% / ${p} psia. No recommendation is made — widen the conditions toward the tested envelope (O₂ 12–34%, 10.18–44.86 psia) to find real evidence.</p></div>`;
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
  /* gate on the bounds as displayed (2 dp): the displayed maximum must itself be accepted */
  const pLo = Math.round(env.pressure_psi[0] * 100) / 100, pHi = Math.round(env.pressure_psi[1] * 100) / 100;
  if (!isFinite(o2) || !isFinite(p)) return { abstain: 'a numeric O₂ and pressure are required' };
  if (!env.fuels.includes(fuel)) return { abstain: `fuel “${fuel}” was never in the training tests (only ${env.fuels.join(' and ')})` };
  if (o2 < env.o2[0] || o2 > env.o2[1]) return { abstain: `O₂ ${o2}% is outside the tested range ${env.o2[0]}–${env.o2[1]}%` };
  if (p < pLo || p > pHi) return { abstain: `pressure ${p} psia is outside the tested range ${fmt(pLo, 2)}–${fmt(pHi, 2)} psia` };
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
    <div class="path">Decision path: ${r.path.join('  →  ')}</div>${nearestRows(fuel, o2, p)}</div>`;
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
/* programme acronyms the cards are known by — BASS, FLEX and Saffire appear
   in the app's own prose but in no card name, so index them explicitly */
const CARD_ALIASES = { 'PSI-25': 'BASS', 'PSI-26': 'BASS', 'PSI-68': 'FLEX', 'PSI-69': 'FLEX', 'PSI-98': 'Saffire', 'PSI-99': 'Saffire', 'PSI-100': 'Saffire' };
function outcomeTxt(c) {
  if (!c.outcomes) return 'No outcome column in PSI table';
  return Object.entries(c.outcomes).map(([k, n]) => `${k} × ${n}`).join(' · ');
}
function renderCards() {
  const q = $('#card-search').value.trim().toLowerCase();
  const list = INV.filter(c => (cardFamily === 'all' || c.family === cardFamily) &&
    (!q || (c.name + ' ' + c.accession + ' ' + c.materials.join(' ') + ' ' + (CARD_ALIASES[c.accession] || '')).toLowerCase().includes(q)));
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
    <button class="goto cmp-btn" data-acc="${c.accession}">${compareSet.has(c.accession) ? '✓ In compare (click to remove)' : '+ Compare'}</button>
  </div>`).join('');
  $('#cards-empty').innerHTML = list.length ? '' : '<div class="empty-note">No investigation matches that search/filter.</div>';
  if (window.gsap) gsap.fromTo('#cards-grid .inv-card', { y: 14 }, { y: 0, duration: .6, ease: 'power2.out', stagger: .03, overwrite: true, clearProps: 'all' });
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
  const [bb, inv, det, sup, model, replay, wake, extra, arch] = await Promise.all(
    ['data/backbone.json', 'data/investigations.json', 'data/detection.json', 'data/suppression.json', 'data/model.json',
     'data/replay.json', 'data/wakeup.json', 'data/extra.json', 'data/archive.json']
      .map(u => fetch(u).then(r => r.json())));
  BB = bb; INV = inv; DET = det; SUP = sup; MODEL = model;
  REPLAY = replay; WAKE = wake; EXTRA = extra; ARCH = arch;
  fill('solids-o2-rows', DET.headlines.solids_o2_rows);
  fill('no-response', DET.headlines.samer_tests_no_response);
  fill('tests-analysed', DET.headlines.samer_tests_analysed);
  fill('flex-n', SUP.flex_total_rows_with_outcome);
  fill('bass-n', SUP.bass.n_rows);
  fill('bass-mats', SUP.bass.materials.join(', '));
  fill('bass-o2', SUP.bass.o2_range ? SUP.bass.o2_range[0] + '–' + SUP.bass.o2_range[1] + '%' : 'not recorded');
  fill('env-o2', MODEL.envelope.o2[0] + '–' + MODEL.envelope.o2[1] + '%');
  fill('env-p', fmt(MODEL.envelope.pressure_psi[0], 2) + '–' + fmt(MODEL.envelope.pressure_psi[1], 2));
  fill('model-n', MODEL.n_rows);
  fill('holdout-n', MODEL.validation.n_holdout);
  fill('holdout-acc', (MODEL.validation.holdout_accuracy * 100).toFixed(1) + '%');
  fill('baseline-acc', (MODEL.validation.majority_baseline_accuracy * 100).toFixed(1) + '%');
  fill('gate-abstain', MODEL.validation.gate_abstained_on_holdout);
  buildMaterialSelect();
  renderDetection(); renderSupChart(); renderValidation(); renderCards(); renderRefs();
  initFinal();
  runCabin(); runScreener(); runSuppression(); runPredictor();
  $('#cc-run').addEventListener('click', runCabin);
  $('#sc-run').addEventListener('click', runScreener);
  $('#sup-run').addEventListener('click', runSuppression);
  $('#pr-run').addEventListener('click', runPredictor);
  runCounters();
  const params = new URLSearchParams(location.search);
  if (params.get('mat')) prefillCabin(params.get('mat'), parseFloat(params.get('o2') || '21'), parseFloat(params.get('p') || '14.7'));
  const start = (location.hash || '#home').slice(1);
  if (document.getElementById('sec-' + start)) showSec(start);
  if (params.has('tour')) startTour();
  if (params.has('selftest')) selfTest();
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
  selfTestFinal(out, t);
  const el = $('#selftest');
  el.style.display = 'block';
  el.innerHTML = '<pre>' + out.join('\n') + '</pre>';
  document.title = 'SELFTEST DONE';
}
/* init() is invoked at the very end of this file, after the FINAL BUILD block. */

/* ================= FINAL BUILD — Nov 14, 2026 =================
   Everything below is computed at runtime from data/replay.json,
   data/wakeup.json, data/extra.json and data/archive.json — which
   prep_final.py computed from the PSI source files. No typed-in data. */

/* ---------- gap -> experiment card ---------- */
function experimentCard(mat, o2, p, flow, rows) {
  const cond = `${o2}% O₂` + (p !== null ? ` / ${p} psia` : '') + (flow !== null ? ` / ${flow} cm/s airflow` : '');
  const accs = [...new Set((rows || []).map(r => r.acc))];
  const owner = accs.length
    ? `It would extend the investigation${accs.length > 1 ? 's' : ''} that already own${accs.length > 1 ? '' : 's'} this material (${accs.join(', ')})`
    : 'No investigation in the backbone owns this material yet — it would be a new test series';
  return `<div class="card wide exp-card"><h3>🔬 The experiment that would settle this</h3>
    <p><strong>Burn ${mat} at ${cond}</strong> — the exact conditions you asked about — and record the outcome. ${owner}. Until that test exists, the honest answer stays <strong>NO TEST DATA</strong>: this is the gap, stated as a testable experiment rather than papered over with a guess.</p></div>`;
}

/* ---------- evidence frontier matrix + condition scatter ---------- */
function renderFrontier() {
  const F = EXTRA.frontier;
  fill('frontier-total', F.total);
  fill('scatter-n', EXTRA.scatter_o2p.length);
  fill('o2flow-n', EXTRA.o2_flow_both);
  const famLabel = { solid: 'Solids', droplet: 'Droplets', gas: 'Gas flames', aerosol: 'Aerosols' };
  const max = Math.max(...F.families.flatMap(f => F.counts[f]));
  let html = '<table class="matrix"><tr><th>Family \\ O₂ band</th>' + F.bands.map((b, i) =>
    `<th>${b}%${i === 2 ? '<br><span class="mx-mark">ISS 21%</span>' : ''}${i === 4 ? '<br><span class="mx-mark">Moon 34%</span>' : ''}${i === 6 ? '<br><span class="mx-mark">Suit 100%</span>' : ''}</th>`).join('') + '</tr>';
  F.families.forEach(f => {
    html += `<tr><td><b>${famLabel[f]}</b></td>` + F.counts[f].map(c =>
      `<td class="mx-cell" style="background:rgba(56,189,248,${c ? 0.12 + 0.55 * c / max : 0})">${c || '—'}</td>`).join('') + '</tr>';
  });
  $('#frontier-matrix').innerHTML = html + '</table>';
  drawScatter();
}
function drawScatter() {
  const cv = $('#scatter-canvas'); if (!cv) return;
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height, L = 48, R = 12, T = 12, B = 32;
  ctx.clearRect(0, 0, W, H);
  const X = o2 => L + (o2 / 100) * (W - L - R), Y = p => H - B - (p / 50) * (H - T - B);
  ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.fillStyle = '#94A3B8'; ctx.font = '11px Inter, sans-serif';
  for (let o2 = 0; o2 <= 100; o2 += 20) { ctx.beginPath(); ctx.moveTo(X(o2), T); ctx.lineTo(X(o2), H - B); ctx.stroke(); ctx.fillText(o2 + '%', X(o2) - 8, H - 14); }
  for (let p = 0; p <= 50; p += 10) { ctx.beginPath(); ctx.moveTo(L, Y(p)); ctx.lineTo(W - R, Y(p)); ctx.stroke(); ctx.fillText(p, 26, Y(p) + 4); }
  ctx.fillText('O₂ %', W - 44, H - 14); ctx.fillText('psia', 6, T + 4);
  const colors = { solid: '#2ECC71', droplet: '#38BDF8', gas: '#FFB020', aerosol: '#c792ff', 'not-a-fuel': '#7f8c8d' };
  EXTRA.scatter_o2p.forEach(([o2, p, cls]) => {
    ctx.fillStyle = colors[cls] || '#fff'; ctx.globalAlpha = 0.55;
    ctx.beginPath(); ctx.arc(X(o2), Y(p), 2.4, 0, 7); ctx.fill();
  });
  ctx.globalAlpha = 1;
}

/* ---------- predict-then-reveal quiz ---------- */
function renderQuiz() {
  const mats = [...DET.by_material].sort((a, b) => a.obsc_drop_med_V - b.obsc_drop_med_V);
  $('#quiz-row').innerHTML = DET.by_material.map(m =>
    `<button class="preset" data-mat="${m.material}">${m.material}</button>`).join('');
  $$('#quiz-row .preset').forEach(b => b.addEventListener('click', () => {
    $$('#quiz-row .preset').forEach(x => x.classList.remove('active')); b.classList.add('active');
    const m = DET.by_material.find(x => x.material === b.dataset.mat);
    const v = m.obsc_drop_med_V;
    const verdict = v < 0.005 ? '<strong>Effectively missed.</strong> The beam moved less than 0.005 V — inside the noise.'
      : v < 0.05 ? '<strong>Barely seen.</strong> A real but feeble response.' : v < 0.15 ? '<strong>Weakly seen.</strong>' : '<strong>Clearly seen.</strong> The strongest responses in the test series.';
    const lowest = mats[0], second = mats[1];
    $('#quiz-reveal').innerHTML = `<div class="verdict ${v < 0.005 ? 'v-red' : v < 0.05 ? 'v-yellow' : 'v-green'}" style="margin-bottom:0">
      <h3>${m.material}: median obscuration drop ${v.toFixed(3)} V across ${m.tests} tests</h3>
      <p>${verdict} The two smokes the detector misses are <strong>${lowest.material} (${lowest.obsc_drop_med_V.toFixed(3)} V)</strong> and <strong>${second.material} (${second.obsc_drop_med_V.toFixed(3)} V)</strong> — wire insulation and film, two of the most common materials in a cabin. The full measured table is directly below.</p></div>`;
  }));
}

/* ---------- SAME-R telemetry replay ---------- */
let replayState = { idx: -1, pos: 0, playing: false, timer: null };
function replayTest() { return REPLAY.tests[replayState.idx]; }
function selectReplay(testNo) {
  const i = REPLAY.tests.findIndex(t => t.test_no === testNo);
  if (i < 0) return;
  replayState.idx = i; replayState.pos = replayTest().t.length - 1; replayState.playing = false;
  clearInterval(replayState.timer); $('#replay-play').textContent = '▶ Play';
  $$('#replay-tests .preset').forEach(b => b.classList.toggle('active', +b.dataset.test === testNo));
  $('#replay-scrub').max = replayTest().t.length - 1; $('#replay-scrub').value = replayState.pos;
  drawReplay(); replayVerdict();
}
function replayVerdict() {
  const T = replayTest();
  const d = DET.by_test.find(x => x.test_no === T.test_no);
  const head = d.obsc_drop_med_V < 0.005 ? 'the obscuration beam effectively never moved'
    : d.obsc_drop_med_V < 0.15 ? 'the obscuration beam moved only weakly' : 'the obscuration beam responded strongly';
  $('#replay-verdict').innerHTML = `Test ${T.test_no} (${T.material}) — over the smoke window: obscuration drop median <b>${d.obsc_drop_med_V.toFixed(3)} V</b> (${head}) · scatter median <b>${d.smoke_window_scat_med_V.toFixed(2)} V</b> · ion median <b>${d.smoke_window_ionA_med_V.toFixed(3)} V</b>. ${T.n_samples_raw} recorded seconds, shown every ${T.step_s} s.`;
}
function drawReplay() {
  const cv = $('#replay-canvas'); if (!cv || replayState.idx < 0) return;
  const T = replayTest();
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height, L = 58, R = 10, Tp = 14, B = 26;
  const tMax = T.t[T.t.length - 1];
  const X = t => L + (t / tMax) * (W - L - R), Yv = (v, mn, mx) => Tp + (1 - (v - mn) / (mx - mn)) * (H - Tp - B);
  ctx.clearRect(0, 0, W, H);
  /* smoke window shading */
  ctx.fillStyle = 'rgba(255,176,32,.07)';
  ctx.fillRect(X(200), Tp, X(Math.min(1000, tMax)) - X(200), H - Tp - B);
  ctx.fillStyle = '#94A3B8'; ctx.font = '11px Inter, sans-serif';
  ctx.fillText('smoke window 200–1000 s', X(210), Tp + 12);
  for (let t = 0; t <= tMax; t += 250) { ctx.fillText(t + 's', X(t) - 8, H - 8); }
  const chans = [
    { k: 'obsc', color: '#7DD3FC', label: 'obsc' },
    { k: 'scat', color: '#FFB020', label: 'scat' },
    { k: 'ion', color: '#2ECC71', label: 'ion' }];
  chans.forEach((c, ci) => {
    const arr = T[c.k], mn = Math.min(...arr), mx = Math.max(...arr), span = (mx - mn) || 1;
    ctx.strokeStyle = c.color; ctx.globalAlpha = 0.20; ctx.lineWidth = 1;
    ctx.beginPath();
    arr.forEach((v, i) => { const x = X(T.t[i]), y = Yv(v, mn, mx); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();
    ctx.globalAlpha = 1; ctx.lineWidth = 1.7;
    ctx.beginPath();
    for (let i = 0; i <= replayState.pos; i++) { const x = X(T.t[i]), y = Yv(arr[i], mn, mx); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = c.color; ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText(`${c.label}`, 4, Tp + 12 + ci * 30);
    ctx.fillText(mx.toFixed(2), 4, Tp + 24 + ci * 30);
    ctx.fillText(mn.toFixed(2), 4, Tp + 36 + ci * 30);
    const cur = arr[replayState.pos];
    ctx.beginPath(); ctx.arc(X(T.t[replayState.pos]), Yv(cur, mn, mx), 3.4, 0, 7); ctx.fill();
  });
  ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(X(T.t[replayState.pos]), Tp); ctx.lineTo(X(T.t[replayState.pos]), H - B); ctx.stroke();
  $('#replay-clock').textContent = `elapsed ${T.t[replayState.pos]} s · obsc ${T.obsc[replayState.pos].toFixed(3)} V · scat ${T.scat[replayState.pos].toFixed(2)} V · ion ${T.ion[replayState.pos].toFixed(3)} V`;
}
function playReplay() {
  if (replayState.playing) { pauseReplay(); return; }
  const T = replayTest();
  if (replayState.pos >= T.t.length - 1) replayState.pos = 0;
  replayState.playing = true; $('#replay-play').textContent = '⏸ Pause';
  replayState.timer = setInterval(() => {
    replayState.pos += 3;
    if (replayState.pos >= T.t.length - 1) { replayState.pos = T.t.length - 1; pauseReplay(); }
    $('#replay-scrub').value = replayState.pos; drawReplay();
  }, 40);
}
function pauseReplay() { replayState.playing = false; clearInterval(replayState.timer); const b = $('#replay-play'); if (b) b.textContent = '▶ Play'; }
function renderReplay() {
  $('#replay-tests').innerHTML = REPLAY.tests.map(t =>
    `<button class="preset" data-test="${t.test_no}">Test ${t.test_no} · ${t.material}</button>`).join('');
  $$('#replay-tests .preset').forEach(b => b.addEventListener('click', () => { pauseReplay(); selectReplay(+b.dataset.test); }));
  $('#replay-play').addEventListener('click', playReplay);
  $('#replay-scrub').addEventListener('input', e => { pauseReplay(); replayState.pos = +e.target.value; drawReplay(); });
  selectReplay(62);
}

/* ---------- detector pairing ---------- */
function renderPairing() {
  const rule = m => {
    if (m.obsc_med < 0.005) return '<span class="chip red">OBSCURATION MISSES IT</span> Pair with scatter / ion — they register what the beam cannot.';
    if (m.scat_med <= -6) return '<span class="chip yellow">ALL CHANNELS FIRE</span> Scatter saturates at its −6.25 V rail; use obscuration / ion for size.';
    if (m.obsc_med >= 0.15) return '<span class="chip green">OBSCURATION SEES IT</span> Any channel works; obscuration is strongest.';
    return '<span class="chip yellow">WEAK ON THE BEAM</span> Scatter / ion carry the signal — fly all three.';
  };
  $('#pairing-table').innerHTML = '<table><tr><th>Material</th><th>Tests</th><th>Obscuration median drop (V)</th><th>Scatter median (V)</th><th>Ion median (V)</th><th>Pairing rule (from these numbers)</th></tr>' +
    EXTRA.pairing.map(m => `<tr><td><b>${m.material}</b></td><td>${m.tests}</td><td>${m.obsc_med.toFixed(3)}</td><td>${m.scat_med.toFixed(2)}</td><td>${m.ion_med.toFixed(3)}</td><td>${rule(m)}</td></tr>`).join('') + '</table>';
}

/* ---------- wake-up timing ---------- */
function renderWake() {
  const order = ['Silicone', 'Pyrell', 'Lampwick', 'Kapton', 'Teflon'];
  const tests = [...WAKE.tests].sort((a, b) => order.indexOf(a.material) - order.indexOf(b.material) || a.test_no - b.test_no);
  const X0 = 168, XW = 730, rowH = 15, top = 26;
  const H = top + tests.length * rowH + 22;
  const X = s => X0 + (s / 800) * XW;
  let svg = `<svg viewBox="0 0 980 ${H}" class="svg-chart" role="img" aria-label="Time to first detector response per test">`;
  for (let s = 0; s <= 800; s += 100) svg += `<line x1="${X(s)}" y1="${top - 6}" x2="${X(s)}" y2="${H - 18}" stroke="rgba(255,255,255,.07)"/><text x="${X(s) - 8}" y="${H - 4}" fill="#94A3B8" font-size="10">${s}s</text>`;
  const shape = (ch, x, y, color) => ch === 'obsc' ? `<circle cx="${x}" cy="${y}" r="4" fill="${color}"/>`
    : ch === 'scat' ? `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" fill="${color}"/>`
    : `<rect x="${x - 3.4}" y="${y - 3.4}" width="6.8" height="6.8" fill="${color}" transform="rotate(45 ${x} ${y})"/>`;
  tests.forEach((t, i) => {
    const y = top + i * rowH + 5;
    svg += `<text x="6" y="${y + 3.5}" fill="#cfdae4" font-size="10.5">${t.material} ${t.test_no}</text>`;
    [['obsc', '#7DD3FC'], ['scat', '#FFB020'], ['ion', '#2ECC71']].forEach(([ch, color]) => {
      const v = t[ch];
      svg += v === null
        ? `<text x="${X(800) + 14}" y="${y + 3.5}" fill="#7f8c8d" font-size="10">✕</text>`
        : shape(ch, X(Math.min(v, 800)), y, color) + `<title>${t.material} test ${t.test_no} — ${ch}: ${v}s</title>`;
    });
  });
  svg += `<text x="${X(800) + 6}" y="${top - 12}" fill="#7f8c8d" font-size="10">✕ = no response in window (per channel)</text>`;
  svg += `<text x="${X0}" y="${top - 12}" fill="#94A3B8" font-size="10.5">● obscuration · ■ scatter · ◆ ion — seconds from smoke-window start (elapsed 200 s)</text></svg>`;
  $('#wake-chart').innerHTML = svg;
  const wins = {};
  WAKE.tests.forEach(t => {
    const chans = [['obsc', t.obsc], ['scat', t.scat], ['ion', t.ion]].filter(([, v]) => v !== null);
    if (!chans.length) return;
    const first = Math.min(...chans.map(([, v]) => v));
    chans.filter(([, v]) => v === first).forEach(([ch]) => {
      wins[t.material] = wins[t.material] || { obsc: 0, scat: 0, ion: 0, n: 0 };
      wins[t.material][ch]++;
    });
    wins[t.material] = wins[t.material] || { obsc: 0, scat: 0, ion: 0, n: 0 };
    wins[t.material].n++;
  });
  $('#wake-summary').innerHTML = 'First channel to wake, by material (ties count for each tied channel): ' +
    order.filter(m => wins[m]).map(m => `<b>${m}</b> — obscuration ${wins[m].obsc} · scatter ${wins[m].scat} · ion ${wins[m].ion} (of ${wins[m].n} tests)`).join(' &nbsp;·&nbsp; ');
}

/* ---------- response distributions ---------- */
function renderDist() {
  const order = ['Silicone', 'Pyrell', 'Lampwick', 'Kapton', 'Teflon'];
  const X0 = 96, XW = 800, rowH = 34, top = 16;
  const H = top + order.length * rowH + 18;
  const X = v => X0 + Math.sqrt(v / 0.92) * XW;
  let svg = `<svg viewBox="0 0 980 ${H}" class="svg-chart" role="img" aria-label="Per-test obscuration drops by material">`;
  [0, 0.05, 0.3, 0.92].forEach(v => { svg += `<line x1="${X(v)}" y1="${top - 4}" x2="${X(v)}" y2="${H - 16}" stroke="rgba(255,255,255,.08)"/><text x="${X(v) - 10}" y="${H - 3}" fill="#94A3B8" font-size="10">${v} V</text>`; });
  order.forEach((m, ri) => {
    const y = top + ri * rowH;
    svg += `<text x="6" y="${y + 16}" fill="#cfdae4" font-size="12">${m}</text>`;
    (EXTRA.distributions[m] || []).forEach((d, i) => {
      const cx = X(d.drop), cy = y + 6 + (i % 3) * 8;
      svg += d.sts
        ? `<rect x="${cx - 4}" y="${cy - 4}" width="8" height="8" fill="none" stroke="#FFB020" stroke-width="1.6" transform="rotate(45 ${cx} ${cy})"><title>Test ${d.test} (STS-detector run) — ${d.drop.toFixed(3)} V</title></rect>`
        : `<circle cx="${cx}" cy="${cy}" r="4" fill="#7DD3FC" fill-opacity="0.75"><title>Test ${d.test} — ${d.drop.toFixed(3)} V</title></circle>`;
    });
  });
  $('#dist-chart').innerHTML = svg + '</svg>';
}

/* ---------- PSI-117 cool flames ---------- */
function renderPsi117() {
  const pts = EXTRA.psi117.filter(r => r.dext_cool !== null);
  const W = 980, H = 330, L = 56, R = 14, T = 12, B = 34;
  const pMax = Math.max(...pts.map(r => r.p_atm)) * 1.05, yMax = Math.max(...pts.map(r => r.dext_cool)) * 1.1;
  const X = p => L + (p / pMax) * (W - L - R), Y = v => H - B - (v / yMax) * (H - T - B);
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="svg-chart" role="img" aria-label="PSI-117 cool-flame extinction diameter versus pressure">`;
  for (let p = 0; p <= pMax; p += Math.max(1, Math.round(pMax / 6))) svg += `<line x1="${X(p)}" y1="${T}" x2="${X(p)}" y2="${H - B}" stroke="rgba(255,255,255,.07)"/><text x="${X(p) - 6}" y="${H - 18}" fill="#94A3B8" font-size="10">${p}</text>`;
  for (let v = 0; v <= yMax; v += yMax / 4) svg += `<text x="8" y="${Y(v) + 3}" fill="#94A3B8" font-size="10">${v.toFixed(1)}</text><line x1="${L}" y1="${Y(v)}" x2="${W - R}" y2="${Y(v)}" stroke="rgba(255,255,255,.05)"/>`;
  svg += `<text x="${W / 2 - 60}" y="${H - 2}" fill="#94A3B8" font-size="11">pressure (atm)</text><text x="8" y="${T + 2}" fill="#94A3B8" font-size="11">cool-flame extinction diameter (mm)</text>`;
  pts.forEach(r => {
    svg += r.type === 'experiment'
      ? `<circle cx="${X(r.p_atm)}" cy="${Y(r.dext_cool)}" r="4.4" fill="#38BDF8" fill-opacity="0.85"><title>${r.fuel}, ${r.p_atm} atm — experiment, ${r.dext_cool.toFixed(2)} mm</title></circle>`
      : `<circle cx="${X(r.p_atm)}" cy="${Y(r.dext_cool)}" r="4.4" fill="none" stroke="#FFB020" stroke-width="1.8"><title>${r.fuel}, ${r.p_atm} atm — model, ${r.dext_cool.toFixed(2)} mm</title></circle>`;
  });
  $('#psi117-chart').innerHTML = svg + '</svg>';
}

/* ---------- PSI-115 particle-size distribution ---------- */
let psdCase = '8cm';
function renderPsd() {
  const P = EXTRA.psd, d = P.diameters_nm, cur = P.cases[psdCase];
  const all = [...cur.Earth, ...cur.Microgravity].filter(v => v > 0);
  const vMin = Math.min(...all), vMax = Math.max(...all);
  const W = 980, H = 300, L = 64, R = 14, T = 12, B = 34;
  const lx = v => Math.log10(v), X = v => L + (lx(v) - lx(d[0])) / (lx(d[d.length - 1]) - lx(d[0])) * (W - L - R);
  const Y = v => H - B - (lx(Math.max(v, vMin)) - lx(vMin)) / (lx(vMax) - lx(vMin)) * (H - T - B);
  let svg = `<div class="preset-row"><button class="preset ${psdCase === '8cm' ? 'active' : ''}" data-psd="8cm">8 cm case</button><button class="preset ${psdCase === '10cm' ? 'active' : ''}" data-psd="10cm">10 cm case</button></div>`;
  svg += `<svg viewBox="0 0 ${W} ${H}" class="svg-chart" role="img" aria-label="PSI-115 particle-size distribution">`;
  [2, 5, 10, 20, 50, 100].filter(v => v >= d[0] && v <= d[d.length - 1]).forEach(v => {
    svg += `<line x1="${X(v)}" y1="${T}" x2="${X(v)}" y2="${H - B}" stroke="rgba(255,255,255,.07)"/><text x="${X(v) - 8}" y="${H - 18}" fill="#94A3B8" font-size="10">${v}</text>`;
  });
  svg += `<text x="${W / 2 - 70}" y="${H - 2}" fill="#94A3B8" font-size="11">particle diameter (nm, log scale)</text>`;
  const line = (arr, color, name) => `<polyline fill="none" stroke="${color}" stroke-width="2" points="${arr.map((v, i) => `${X(d[i]).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}"><title>${name}</title></polyline>`;
  svg += line(cur.Earth, '#7cc4ff', 'Earth') + line(cur.Microgravity, '#FFB020', 'Microgravity');
  svg += `<text x="${L + 8}" y="${T + 14}" fill="#7cc4ff" font-size="12">— Earth gravity</text><text x="${L + 130}" y="${T + 14}" fill="#FFB020" font-size="12">— Microgravity</text></svg>`;
  $('#psd-chart').innerHTML = svg;
  $$('#psd-chart [data-psd]').forEach(b => b.addEventListener('click', () => { psdCase = b.dataset.psd; renderPsd(); }));
}

/* ---------- smoke stills switcher ---------- */
let smokeState = { case: '8cm', flow: false };
function updateSmoke() {
  const sfx = smokeState.flow ? '-flow' : '';
  $('#smoke-img-earth').src = `assets/smoke-${smokeState.case}-earth${sfx}.png`;
  $('#smoke-img-ug').src = `assets/smoke-${smokeState.case}-ug${sfx}.png`;
}

/* ---------- predictor decision / refusal map ---------- */
let pmapFuel = 'Methanol';
function renderPmap() {
  const cv = $('#pmap-canvas'); if (!cv) return;
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height, L = 46, R = 10, T = 10, B = 28;
  const o2a = 10, o2b = 36, pa = 8, pb = 47;
  const cw = (W - L - R) / 52, ch = (H - T - B) / 52;
  ctx.clearRect(0, 0, W, H);
  for (let i = 0; i < 52; i++) for (let j = 0; j < 52; j++) {
    const o2 = o2a + (i + 0.5) * (o2b - o2a) / 52, p = pb - (j + 0.5) * (pb - pa) / 52;
    const r = predict(pmapFuel, Math.round(o2 * 10) / 10, Math.round(p * 10) / 10);
    if (r.abstain) ctx.fillStyle = '#141d2c';
    else if (r.prediction === 'Extinction') ctx.fillStyle = `rgba(46,204,113,${0.25 + 0.7 * r.proba})`;
    else ctx.fillStyle = `rgba(255,59,48,${0.30 + 0.65 * (1 - r.proba)})`;
    ctx.fillRect(L + i * cw, T + j * ch, cw + 0.6, ch + 0.6);
  }
  ctx.fillStyle = '#94A3B8'; ctx.font = '11px Inter, sans-serif';
  for (let o2 = 12; o2 <= 36; o2 += 4) ctx.fillText(o2 + '%', L + (o2 - o2a) / (o2b - o2a) * (W - L - R) - 8, H - 10);
  for (let p = 10; p <= 45; p += 5) ctx.fillText(p, 22, T + (pb - p) / (pb - pa) * (H - T - B) + 4);
  ctx.fillText('psia', 4, T + 8);
}

/* ---------- predictor nearest training rows ---------- */
function nearestRows(fuel, o2, p) {
  if (!EXTRA) return '';
  const near = EXTRA.training_rows.filter(r => r.fuel === fuel)
    .map(r => ({ r, d: Math.hypot((r.o2 - o2) / 22, (r.p - p) / 34.7) }))
    .sort((a, b) => a.d - b.d).slice(0, 5);
  if (!near.length) return '';
  return `<div class="chart-note" style="margin-top:12px"><b>Nearest real training rows</b> (the actual tests this prediction stands next to):</div>
    <table><tr><th>Fuel</th><th>O₂</th><th>Pressure (psia)</th><th>Recorded outcome</th></tr>` +
    near.map(({ r }) => `<tr><td>${r.fuel}</td><td>${r.o2}%</td><td>${r.p}</td><td>${r.out}</td></tr>`).join('') + '</table>';
}

/* ---------- recorded burn times ---------- */
function renderBurn() {
  fill('burn-n', EXTRA.burn.length);
  const pts = EXTRA.burn;
  const W = 980, H = 300, L = 52, R = 14, T = 12, B = 34;
  const yMax = Math.max(...pts.map(p => p.burn_s)) * 1.05;
  const X = o => L + (o - 10) / (36 - 10) * (W - L - R), Y = v => H - B - (v / yMax) * (H - T - B);
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="svg-chart" role="img" aria-label="FLEX recorded burn times versus oxygen">`;
  for (let o = 12; o <= 34; o += 4) svg += `<line x1="${X(o)}" y1="${T}" x2="${X(o)}" y2="${H - B}" stroke="rgba(255,255,255,.07)"/><text x="${X(o) - 8}" y="${H - 18}" fill="#94A3B8" font-size="10">${o}%</text>`;
  svg += `<text x="8" y="${T + 4}" fill="#94A3B8" font-size="11">burn time (s)</text><text x="${W / 2 - 20}" y="${H - 2}" fill="#94A3B8" font-size="11">test O₂ %</text>`;
  pts.forEach(p => {
    svg += `<circle cx="${X(p.o2)}" cy="${Y(p.burn_s)}" r="3.2" fill="${p.fuel === 'Methanol' ? '#38BDF8' : '#FFB020'}" fill-opacity="0.6"><title>${p.fuel}, ${p.o2}% O₂ — burned ${p.burn_s} s</title></circle>`;
  });
  svg += `<text x="${L + 8}" y="${T + 14}" fill="#38BDF8" font-size="12">● Methanol</text><text x="${L + 110}" y="${T + 14}" fill="#FFB020" font-size="12">● Heptane</text></svg>`;
  $('#burn-chart').innerHTML = svg;
  $('#burn-table').innerHTML = '<table><tr><th>Fuel</th><th>O₂ band</th><th>Tests (n)</th><th>Median recorded burn time</th></tr>' +
    EXTRA.burn_bins.map(b => `<tr><td>${b.fuel}</td><td>${b.o2_bin}%</td><td>${b.n}</td><td>${b.median_s} s</td></tr>`).join('') + '</table>';
}

/* ---------- investigation compare + overlap ---------- */
let compareSet = new Set();
function renderCompare() {
  const bar = $('#compare-bar'), out = $('#compare-out');
  const sel = INV.filter(c => compareSet.has(c.accession));
  bar.style.display = sel.length ? 'flex' : 'none';
  $('#compare-count').textContent = sel.length ? `${sel.length} selected for compare${sel.length === 1 ? ' — pick at least one more' : ''}` : '';
  if (sel.length < 2) { out.innerHTML = ''; return; }
  const row = (label, fn) => `<tr><th>${label}</th>` + sel.map(c => `<td>${fn(c)}</td>`).join('') + '</tr>';
  out.innerHTML = `<div class="card wide"><h3>Side by side</h3><table><tr><th></th>${sel.map(c => `<th>${c.accession} — ${c.name}</th>`).join('')}</tr>` +
    row('Records', c => c.n_rows) +
    row('Tested O₂', c => c.o2_range ? fmt(c.o2_range[0]) + '–' + fmt(c.o2_range[1]) + '%' : 'not recorded') +
    row('Pressure', c => c.pressure_range_psi ? c.pressure_range_psi[0] + '–' + c.pressure_range_psi[1] + ' psia' : 'not recorded') +
    row('Outcomes', c => outcomeTxt(c)) +
    row('Top materials', c => c.materials.join(', ') || '—') +
    row('DOI', c => `<a href="https://doi.org/${c.doi}" target="_blank" rel="noopener">${c.doi}</a>`) +
    '</table></div>';
}
function renderOverlap() {
  fill('overlap-multi', EXTRA.overlap.n_multi);
  fill('overlap-single', EXTRA.overlap.n_single);
  $('#overlap-table').innerHTML = '<table><tr><th>Material</th><th>Tested in</th><th>Investigations</th></tr>' +
    EXTRA.overlap.multi.map(o => `<tr><td><b>${o.material}</b></td><td>${o.investigations.length}</td><td>${o.investigations.join(' · ')}</td></tr>`).join('') + '</table>';
}

/* ---------- Open Archive ---------- */
function archRowHtml(r) {
  const rng = a => a ? (a[0] === a[1] ? fmt(a[0]) : `${fmt(a[0])}–${fmt(a[1])}`) : 'not recorded';
  return `<tr class="ar-row" data-ref="${r.ref}"><td>${r.ref}</td><td>${r.acc}</td><td>${r.mraw || '—'}</td><td>${rng(r.o2)}</td><td>${rng(r.p)}</td><td>${r.flow !== null ? r.flow : '—'}</td><td>${r.out || '—'}</td><td>${r.burn !== null ? r.burn : '—'}</td></tr>`;
}
function renderArchive() {
  const acc = $('#ar-acc').value, cls = $('#ar-cls').value, mat = $('#ar-mat').value;
  const q = $('#ar-q').value.trim().toLowerCase();
  const omin = parseFloat($('#ar-o2min').value), omax = parseFloat($('#ar-o2max').value);
  const onlyOut = $('#ar-outcome').checked;
  const list = ARCH.rows.filter(r =>
    (!acc || r.acc === acc) && (!cls || r.cls === cls) && (!mat || r.mat === mat) &&
    (!q || (r.ref + ' ' + (r.mraw || '') + ' ' + (r.notes || '')).toLowerCase().includes(q)) &&
    (!isFinite(omin) || (r.o2 && r.o2[1] >= omin)) && (!isFinite(omax) || (r.o2 && r.o2[0] <= omax)) &&
    (!onlyOut || r.out));
  $('#ar-count').textContent = `${list.length} of 2,012 records match — showing the first ${Math.min(list.length, 150)}.`;
  $('#ar-table').innerHTML = '<table><tr><th>Row ref</th><th>PSI</th><th>Material (as recorded)</th><th>O₂ %</th><th>Pressure (psia)</th><th>Flow (cm/s)</th><th>Outcome</th><th>Burn (s)</th></tr>' +
    list.slice(0, 150).map(archRowHtml).join('') + '</table>';
}
function initArchive() {
  const h = EXTRA.honesty;
  fill('honest-outcome', h.with_outcome); fill('honest-total', h.total); fill('honest-pct', h.pct_with_outcome);
  $('#honest-fill').style.width = h.pct_with_outcome + '%';
  $('#honest-kinds').textContent = 'Record kinds: ' + Object.entries(h.kinds).map(([k, n]) => `${k} ${n}`).join(' · ') + '.';
  const accSel = $('#ar-acc');
  INV.forEach(c => { const o = document.createElement('option'); o.value = c.accession; o.textContent = `${c.accession} — ${c.name}`; accSel.appendChild(o); });
  const matSel = $('#ar-mat');
  [...new Set(ARCH.rows.map(r => r.mat).filter(Boolean))].sort().forEach(m => {
    const o = document.createElement('option'); o.value = m; o.textContent = m; matSel.appendChild(o);
  });
  ['ar-acc', 'ar-cls', 'ar-mat', 'ar-q', 'ar-o2min', 'ar-o2max', 'ar-outcome'].forEach(id =>
    $('#' + id).addEventListener('input', renderArchive));
  $('#ar-table').addEventListener('click', e => {
    const tr = e.target.closest('.ar-row'); if (!tr) return;
    const next = tr.nextElementSibling;
    if (next && next.classList.contains('ar-detail')) { next.remove(); return; }
    const r = ARCH.rows.find(x => x.ref === tr.dataset.ref && x.acc === tr.children[1].textContent);
    if (!r) return;
    const d = document.createElement('tr'); d.className = 'ar-detail';
    d.innerHTML = `<td colspan="8"><b>${r.inv}</b> · row kind: ${r.kind}${r.variant ? ` · variant: ${r.variant}` : ''}${r.out_field ? ` · outcome field: ${r.out_field}` : ''}${r.fi !== null ? ` · flames ignited: ${r.fi}` : ''}<br>` +
      (r.notes ? `Notes: ${r.notes}<br>` : '') + (r.flags ? `Flags: ${r.flags}<br>` : '') +
      `Source table: ${r.table} · DOI: <a href="https://doi.org/${r.doi}" target="_blank" rel="noopener">${r.doi}</a></td>`;
    tr.after(d);
  });
  renderArchive();
}

/* ---------- Home archive peek (depth-visibility pass) ---------- */
function renderHomePeek() {
  /* the archive's own header + row renderer over the same ARCH data —
     the first five records, exactly as the Open Archive shows them */
  $('#home-peek').innerHTML = '<table><tr><th>Row ref</th><th>PSI</th><th>Material (as recorded)</th><th>O₂ %</th><th>Pressure (psia)</th><th>Flow (cm/s)</th><th>Outcome</th><th>Burn (s)</th></tr>' +
    ARCH.rows.slice(0, 5).map(archRowHtml).join('') + '</table>';
  $('#peek-more').textContent = (ARCH.rows.length - 5).toLocaleString('en-US');
}

/* ---------- glossary tooltips ---------- */
function wireGlossary() {
  const tip = $('#gloss-tip');
  const show = el => {
    const r = el.getBoundingClientRect();
    tip.textContent = el.dataset.def; tip.style.display = 'block';
    tip.style.left = Math.min(r.left, innerWidth - 300) + 'px';
    tip.style.top = (r.bottom + 8) + 'px';
  };
  $$('.gloss').forEach(el => {
    el.addEventListener('mouseenter', () => show(el));
    el.addEventListener('mouseleave', () => tip.style.display = 'none');
    el.addEventListener('click', () => tip.style.display === 'block' ? tip.style.display = 'none' : show(el));
  });
}

/* ---------- command palette (Cmd/Ctrl-K) ---------- */
function cmdkEntries() {
  const secs = [['Home — Tested-or-Silent', 'home'], ['Cabin Check', 'cabin'], ['Inventory Screener', 'screener'],
    ['Detection Panel', 'detection'], ['Flame Lab', 'flamelab'], ['Suppression View', 'suppression'], ['Safe Predictor', 'predictor'],
    ['Investigation Cards', 'cards'], ['Open Archive', 'archive'], ['References & Method', 'refs']]
    .map(([label, sec]) => ({ label, run: () => showSec(sec) }));
  const acts = [{ label: '▶ Start the 90-second tour', run: () => startTour() }];
  const mats = [...new Set(BB.rows.map(r => r.mat).filter(Boolean))].slice(0, 60)
    .map(m => ({ label: `Cabin Check: ${m}`, run: () => prefillCabin(m, 21, 14.7) }));
  const invs = INV.map(c => ({ label: `Investigation: ${c.accession} — ${c.name}`, run: () => { showSec('cards'); $('#card-search').value = c.accession; renderCards(); } }));
  return [...secs, ...acts, ...mats, ...invs];
}
function wireCmdk() {
  const box = $('#cmdk'), input = $('#cmdk-input'), list = $('#cmdk-list');
  let entries = [];
  const render = () => {
    const q = input.value.trim().toLowerCase();
    const hits = entries.filter(e => !q || e.label.toLowerCase().includes(q)).slice(0, 12);
    list.innerHTML = hits.map((e, i) => `<button class="cmdk-item" data-i="${entries.indexOf(e)}">${e.label}</button>`).join('') ||
      '<div class="chart-note" style="padding:10px">No match.</div>';
    list.querySelectorAll('.cmdk-item').forEach(b => b.addEventListener('click', () => { close(); entries[+b.dataset.i].run(); }));
  };
  const open = () => { entries = cmdkEntries(); box.style.display = 'flex'; input.value = ''; render(); input.focus(); };
  const close = () => box.style.display = 'none';
  $('#cmdk-open').addEventListener('click', open);
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); box.style.display === 'flex' ? close() : open(); }
    if (e.key === 'Escape') close();
  });
  input.addEventListener('input', render);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { const first = list.querySelector('.cmdk-item'); if (first) first.click(); } });
  box.addEventListener('click', e => { if (e.target === box) close(); });
}

/* ---------- Cabin Check pre-fill (deep links, refusal card, palette, tour) ---------- */
function prefillCabin(mat, o2, p) {
  const sel = $('#cc-material');
  if ([...sel.options].some(o => o.value === mat)) sel.value = mat;
  $('#cc-o2').value = o2; $('#cc-p').value = p === null ? '' : p;
  showSec('cabin'); runCabin();
}
function fillRefusal() {
  const rows = BB.rows.filter(r => r.mat === 'PMMA' && r.kind !== 'design-range');
  const o2s = rows.filter(r => r.o2).map(r => mid(r.o2));
  fill('pmma-rows', rows.length);
  fill('pmma-max-o2', o2s.length ? fmt(Math.max(...o2s), 1) : '—');
  fill('pmma-moon-matched', cabinCheck('PMMA', 34, 8.2, null).matched.length);
  $('#refusal-run').addEventListener('click', () => prefillCabin('PMMA', 34, 8.2));
}

/* ---------- 90-second judge tour ---------- */
const TOUR = [
  { text: 'The gap in one number: in the PSI data used here, solid cabin materials were never tested above 22.2% O₂. The recommended exploration atmosphere for the Moon cabin is 34%.',
    apply() { showSec('home'); }, target: () => $$('#sec-home .stat.card')[0] },
  { text: 'Tested-or-Silent, live: PMMA at the Moon cabin matches zero test rows — so the tool says NO TEST DATA, and proposes the experiment that would settle it instead of guessing.',
    apply() { prefillCabin('PMMA', 34, 8.2); }, target: () => $('#cc-result .verdict') || $('#cc-result') },
  { text: 'The station\u2019s own recording, replayed: in Kapton test 62 smoke is generated from 200 s — watch the blue obscuration trace barely move while scatter and ion respond.',
    apply() { showSec('detection'); selectReplay(62); playReplay(); }, target: () => $('#replay-canvas') },
  { text: 'Suppression from evidence, not opinion: at cabin conditions, 63 of 78 matched real FLEX flames went out.',
    apply() { showSec('suppression'); runSuppression(); }, target: () => $('#sup-result .verdict') || $('#sup-result') },
  { text: 'And the model refuses: at 60% O₂ — far outside its tested envelope — the Safe Predictor abstains rather than guess. Tested, or silent.',
    apply() { showSec('predictor'); $('#pr-fuel').value = 'Methanol'; $('#pr-o2').value = '60'; $('#pr-p').value = '14.7'; runPredictor(); }, target: () => $('#pr-result .verdict') || $('#pr-result') },
];
let tourIdx = -1;
function tourApply() {
  $$('.tour-hl').forEach(e => e.classList.remove('tour-hl'));
  const stop = TOUR[tourIdx];
  stop.apply();
  $('#tour-step').textContent = `Stop ${tourIdx + 1} of ${TOUR.length} · `;
  $('#tour-text').textContent = stop.text;
  $('#tour-back').disabled = tourIdx === 0;
  $('#tour-next').textContent = tourIdx === TOUR.length - 1 ? 'Finish' : 'Next →';
  setTimeout(() => {
    const el = stop.target();
    if (el) { el.classList.add('tour-hl'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }, 60);
}
function startTour() { tourIdx = 0; $('#tour-bar').style.display = 'flex'; tourApply(); }
function endTour() {
  tourIdx = -1; $('#tour-bar').style.display = 'none';
  $$('.tour-hl').forEach(e => e.classList.remove('tour-hl'));
  pauseReplay();
}
function wireTour() {
  $('#tour-start').addEventListener('click', startTour);
  $('#tour-exit').addEventListener('click', endTour);
  $('#tour-back').addEventListener('click', () => { if (tourIdx > 0) { tourIdx--; tourApply(); } });
  $('#tour-next').addEventListener('click', () => {
    if (tourIdx >= TOUR.length - 1) { endTour(); showSec('home'); } else { tourIdx++; tourApply(); }
  });
}

/* ---------- final-build init ---------- */
function initFinal() {
  fillRefusal();
  renderFrontier(); renderQuiz(); renderReplay(); renderPairing(); renderWake(); renderDist();
  renderPsi117(); renderPsd(); renderBurn(); renderOverlap(); initArchive(); renderHomePeek();
  initFlameLab();
  renderPmap();
  $$('.pmap-fuel').forEach(b => b.addEventListener('click', () => {
    $$('.pmap-fuel').forEach(x => x.classList.remove('active')); b.classList.add('active');
    pmapFuel = b.dataset.fuel; renderPmap();
  }));
  $$('#smoke-case-row .preset[data-case]').forEach(b => b.addEventListener('click', () => {
    $$('#smoke-case-row .preset[data-case]').forEach(x => x.classList.remove('active')); b.classList.add('active');
    smokeState.case = b.dataset.case; updateSmoke();
  }));
  $('#smoke-flow-toggle').addEventListener('click', e => {
    smokeState.flow = !smokeState.flow;
    e.currentTarget.classList.toggle('active', smokeState.flow);
    e.currentTarget.textContent = smokeState.flow ? 'Hide flow direction' : 'Show flow direction';
    updateSmoke();
  });
  $('#cards-grid').addEventListener('click', e => {
    const b = e.target.closest('.cmp-btn'); if (!b) return;
    const acc = b.dataset.acc;
    if (compareSet.has(acc)) compareSet.delete(acc);
    else { if (compareSet.size >= 3) compareSet.delete([...compareSet][0]); compareSet.add(acc); }
    renderCards(); renderCompare();
  });
  $('#compare-clear').addEventListener('click', () => { compareSet.clear(); renderCards(); renderCompare(); });
  wireGlossary(); wireCmdk(); wireTour();
}

/* ---------- extended self-test ---------- */
function selfTestFinal(out, t) {
  const rp62 = REPLAY.tests.find(x => x.test_no === 62);
  const rpSil = REPLAY.tests.find(x => x.material === 'Silicone');
  const winRange = (T, a, b) => { const v = T.obsc.filter((_, i) => T.t[i] >= a && T.t[i] <= b); return Math.max(...v) - Math.min(...v); };
  t('Replay has 3 exemplar tests', REPLAY.tests.length === 3, `(${REPLAY.tests.map(x => x.test_no).join(',')})`);
  t('Replay Kapton62 obsc range < Silicone range', winRange(rp62, 200, 1000) < winRange(rpSil, 200, 1000),
    `(${winRange(rp62, 200, 1000).toFixed(3)} vs ${winRange(rpSil, 200, 1000).toFixed(3)})`);
  t('Wake-up tests == 37 (STS-config excluded)', WAKE.tests.length === 37, `(${WAKE.tests.length})`);
  const w66 = WAKE.tests.find(x => x.test_no === 66), w62 = WAKE.tests.find(x => x.test_no === 62);
  t('Wake test66 obscuration in 20–120 s', w66.obsc >= 20 && w66.obsc <= 120, `(${w66.obsc}s)`);
  t('Wake test62 all three channels respond', w62.obsc !== null && w62.scat !== null && w62.ion !== null,
    `(${w62.obsc}/${w62.scat}/${w62.ion})`);
  const fsum = EXTRA.frontier.families.reduce((a, f) => a + EXTRA.frontier.counts[f].reduce((x, y) => x + y, 0), 0);
  t('Frontier matrix sums to its total', fsum === EXTRA.frontier.total, `(${fsum})`);
  t('Archive rows == 2012', ARCH.rows.length === 2012, `(${ARCH.rows.length})`);
  t('Archive recorded outcomes == 546', ARCH.rows.filter(r => r.out).length === 546,
    `(${ARCH.rows.filter(r => r.out).length})`);
  t('Training rows == 273', EXTRA.training_rows.length === 273, `(${EXTRA.training_rows.length})`);
  t('PSI-117 rows == 93 with model + experiment', EXTRA.psi117.length === 93 &&
    EXTRA.psi117.some(r => r.type === 'model') && EXTRA.psi117.some(r => r.type === 'experiment'), '');
  t('Burn-time points >= 250', EXTRA.burn.length >= 250, `(${EXTRA.burn.length})`);
  t('Overlap materials in >=2 investigations == 18', EXTRA.overlap.n_multi === 18, `(${EXTRA.overlap.n_multi})`);
  t('Predictor map cell outside envelope abstains', !!predict('Methanol', 20, 5).abstain, '');
  t('Experiment card generates from inputs',
    experimentCard('PMMA', 34, 8.2, null, BB.rows.filter(r => r.mat === 'PMMA')).includes('PMMA at 34% O₂'), '');
  t('Nearest-rows grounding renders', nearestRows('Methanol', 21, 14.7).includes('Nearest real training rows'), '');
  t('Home refusal card computed 0 matched', cabinCheck('PMMA', 34, 8.2, null).matched.length === 0, '');
}

/* ---------- Flame Lab — simplified grid simulation (Nov 14, 2026) ----------
   Two 64x48 grids, same ignition, same fuel surface. Cells ignite, burn and
   burn out by simple rules; flame and smoke are particles moved by each
   world's flow rule (Earth: buoyant updraft; microgravity: diffusion only,
   so smoke accumulates). The surface spread rate comes only from the two
   measured PSI-108 anchors. Detector levels are measured SAME-R medians. */
const FL = { cols: 64, rows: 48, cell: 7, ox: 11, oy: 46, fuelTop: 42, timeScale: 40, pxPerCm: 8 };
FL.cellCm = FL.cell / FL.pxPerCm;
const FL_ANCHORS = [[35, 0.092], [50, 0.547]];
function flRate(o2) {
  if (o2 <= FL_ANCHORS[0][0]) return FL_ANCHORS[0][1];
  if (o2 >= FL_ANCHORS[1][0]) return FL_ANCHORS[1][1];
  return FL_ANCHORS[0][1] + (o2 - FL_ANCHORS[0][0]) * (FL_ANCHORS[1][1] - FL_ANCHORS[0][1]) / (FL_ANCHORS[1][0] - FL_ANCHORS[0][0]);
}
const flHash = (c, r) => { const x = Math.sin(c * 127.1 + r * 311.7) * 43758.5453; return x - Math.floor(x); };
const flState = { o2: 35, vent: false, cool: false, moon: false, fuel: 'Methanol', smokeMat: 'Silicone', pExt: 0.767, ventK: 0, det: 0, doneT: 0 };
let flEarth = null, flUG = null, flReduced = false, flLast = 0;

/* ---------- Flame Lab rendering — soft sprite flames (visual pass, Nov 14) ----------
   Rendering only: the cell simulation, spread rates, spawn probabilities,
   particle lifetimes and the detector feed are unchanged. Flames are drawn
   as additive radial-gradient sprites over a soft body glow, so a still
   frame reads as fire — Earth a teardrop plume, microgravity a round blue
   ball centred on the burn zone.
   Iteration 2 (same day): Earth flames are layered teardrop silhouettes
   along a noise-deformed spine (no round glow orbs), the µg ball is built
   from concentric layers with a capped pale core and a defined rim, and
   the fuel surface is one smooth band with smooth burned/cool washes —
   still rendering only.
   Iteration 3 (same day): the teardrop leans one-sided with uneven edges
   (no mirrored silhouette), layer gradients gain stops so the colour
   blends without banding, the flame foot sinks into the surface ember
   glow, the detached tip fragments are gone and Earth texture particles
   render only inside a flame body; the µg view draws ONE ball on the
   principal burning run with a calm gradient interior (particles are a
   faint whisper inside that ball only) — still rendering only.
   Iteration 4 (same day): the µg rim stroke is GONE and the ball is no
   longer a perfect circle — its envelope is a noise-deformed closed path
   whose edge wobbles ±5% and evolves slowly, filled by the gradient's own
   falloff, with 2–3 large soft glow masses drifting inside (clipped to
   the envelope) so the sphere reads as a volume of burning gas, not a
   solid planet; the Earth layers are feathered (extra expanded low-alpha
   passes, wider inner layers) so they melt into one flame instead of
   stacked leaf silhouettes, with stronger height-weighted edge noise;
   the ground washes feather out at both ends — no rectangular blocks.
   Still rendering only. */
function flMakeSprite(stops) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return cv;
}
/* Smooth pseudo-random variation in [-1,1] — layered sines per seed, so
   flame edges shimmer unevenly instead of the whole flame pulsing in
   unison. Rendering only. */
function flNoise(seed, t) {
  return Math.sin(t * 1.7 + seed) * .5 + Math.sin(t * 2.9 + seed * 1.7) * .3 + Math.sin(t * 5.3 + seed * .6) * .2;
}
let FL_SPR = null;
function flSprites() {
  if (FL_SPR) return FL_SPR;
  FL_SPR = {
    earth: flMakeSprite([[0, 'rgba(255,252,235,1)'], [.22, 'rgba(255,224,130,.95)'], [.5, 'rgba(255,146,32,.72)'], [.78, 'rgba(226,64,8,.30)'], [1, 'rgba(200,40,0,0)']]),
    ug: flMakeSprite([[0, 'rgba(240,248,255,1)'], [.28, 'rgba(165,205,255,.95)'], [.58, 'rgba(70,130,250,.68)'], [.82, 'rgba(40,80,220,.26)'], [1, 'rgba(30,60,200,0)']]),
    /* soft µg texture sprite — no hot centre, so overlapping particles can
       never stack into bright mottled spots inside the ball */
    ugSoft: flMakeSprite([[0, 'rgba(168,204,255,.50)'], [.45, 'rgba(112,162,250,.32)'], [.75, 'rgba(70,120,235,.14)'], [1, 'rgba(50,100,225,0)']]),
    core: flMakeSprite([[0, 'rgba(255,255,255,1)'], [.45, 'rgba(255,240,200,.85)'], [1, 'rgba(255,200,80,0)']]),
    smoke: flMakeSprite([[0, 'rgba(168,178,194,.50)'], [.55, 'rgba(150,160,178,.26)'], [1, 'rgba(150,160,178,0)']]),
    cool: flMakeSprite([[0, 'rgba(214,232,255,.9)'], [.55, 'rgba(150,195,250,.42)'], [1, 'rgba(150,195,250,0)']])
  };
  return FL_SPR;
}
/* Geometry of the active burn zone on the fuel surface — where the flame
   body sits, and (microgravity) the radius of the round flame ball. */
function flBurnGeom(s) {
  let minC = -1, maxC = -1;
  for (let c = 0; c < FL.cols; c++) if (s.state[FL.fuelTop * FL.cols + c] === 2) { if (minC < 0) minC = c; maxC = c; }
  if (maxC < 0) for (let i = 0; i < s.state.length; i++) if (s.state[i] === 2) { const c = i % FL.cols; if (minC < 0 || c < minC) minC = c; if (c > maxC) maxC = c; }
  if (maxC < 0) return null;
  const cx = FL.ox + (minC + maxC + 1) / 2 * FL.cell;
  const wPx = (maxC - minC + 1) * FL.cell;
  const surfY = FL.oy + FL.fuelTop * FL.cell;
  const R = Math.max(20, Math.min(70, wPx * .62));
  return { cx, surfY, wPx, R, cy: surfY - R * .55 };
}
/* Rendering geometry for the ONE microgravity ball: the simulation has a
   single ignition source, so the ball sits on the principal burning run —
   the run containing the ignition column, or the widest run once that one
   has burned out — never stretched across separated runs. Secondary runs
   get only the surface ember glow in flDrawGround. Rendering only. */
function flPrincipalGeom(s) {
  const cls = flBurnClusters(s);
  if (!cls.length) return null;
  const ignX = FL.ox + (FL.cols / 2) * FL.cell;
  let pick = null;
  for (const cl of cls) if (Math.abs(cl.cx - ignX) <= cl.wPx / 2 + FL.cell) { pick = cl; break; }
  if (!pick) { pick = cls[0]; for (const cl of cls) if (cl.wPx > pick.wPx) pick = cl; }
  const surfY = FL.oy + FL.fuelTop * FL.cell;
  const R = Math.max(20, Math.min(70, pick.wPx * .62));
  return { cx: pick.cx, surfY, wPx: pick.wPx, R, cy: surfY - R * .55 };
}
/* Contiguous runs of burning surface cells — the Earth plume is drawn per
   run, so the glow sits on the actual flame fronts, not between them. */
function flBurnClusters(s) {
  const runs = [];
  let start = -1;
  for (let c = 0; c <= FL.cols; c++) {
    /* a column counts as burning if any fuel row burns in it — late in a
       burn the top row can be out while deeper rows still flame, and
       those columns emit the flame particles the body must sit under */
    let on = false;
    if (c < FL.cols) for (let r = FL.fuelTop; r < FL.rows && !on; r++) on = s.state[r * FL.cols + c] === 2;
    if (on && start < 0) start = c;
    if (!on && start >= 0) { runs.push([start, c - 1]); start = -1; }
  }
  const merged = [];
  for (const [a, b] of runs) {
    const last = merged[merged.length - 1];
    if (last && a - last[1] <= 18) last[1] = b; else merged.push([a, b]);
  }
  /* cap at 3 bodies by merging the closest pair — every visible front
     gets a flame body, so particle texture never sits alone as a blob */
  while (merged.length > 3) {
    let bi = 0, bg = 1e9;
    for (let i = 0; i < merged.length - 1; i++) { const gp = merged[i + 1][0] - merged[i][1]; if (gp < bg) { bg = gp; bi = i; } }
    merged[bi][1] = merged[bi + 1][1]; merged.splice(bi + 1, 1);
  }
  if (!merged.length) {
    const g = flBurnGeom(s);
    return g ? [{ cx: g.cx, wPx: g.wPx }] : [];
  }
  return merged.map(([a, b]) => ({ cx: FL.ox + (a + b + 1) / 2 * FL.cell, wPx: (b - a + 1) * FL.cell }));
}

function flBin(fuel) { return SUP.flex_extinction_by_o2.find(b => b.fuel === fuel && b.o2_bin === '20\u201324'); }
function flIgnite(s, i) { s.state[i] = 2; s.burn[i] = 0; }
function flBurnDur(s, i) { return s.selfExt[i] ? 15 : 46; }
function flResetSim(s) {
  s.state.fill(0); s.burn.fill(0); s.pre.fill(0); s.cool.fill(0); s.early.fill(0); s.parts.length = 0;
  for (let r = FL.fuelTop; r < FL.rows; r++) for (let c = 0; c < FL.cols; c++) {
    const i = r * FL.cols + c; s.state[i] = 1; s.selfExt[i] = flHash(c, r) < flState.pExt ? 1 : 0;
  }
  flIgnite(s, FL.fuelTop * FL.cols + (FL.cols >> 1));
}
function flNewSim(ug, canvas) {
  const s = { ug, ctx: canvas.getContext('2d'), state: new Uint8Array(FL.cols * FL.rows),
    burn: new Float32Array(FL.cols * FL.rows), pre: new Float32Array(FL.cols * FL.rows),
    cool: new Float32Array(FL.cols * FL.rows), early: new Uint8Array(FL.cols * FL.rows),
    selfExt: new Uint8Array(FL.cols * FL.rows), parts: [] };
  flResetSim(s); return s;
}
function flStep(s, dt) {
  /* cell logic runs in <=0.1 sim-second substeps so the front crosses each
     surface cell in almost exactly cellCm/rate — the measured spread time. */
  const total = dt * FL.timeScale;
  const n = Math.max(1, Math.ceil(total / 0.1)), h = total / n;
  let any = false;
  for (let k = 0; k < n; k++) any = flStepCells(s, h) || any;
  flParticles(s, dt);
  return any;
}
function flStepCells(s, dtS) {
  const delaySurf = FL.cellCm / flRate(flState.o2);
  const C = FL.cols, R = FL.rows, st = s.state;
  const canSpread = s.ug || !flState.vent;
  if (canSpread) for (let r = FL.fuelTop; r < R; r++) for (let c = 0; c < C; c++) {
    const i = r * C + c; if (st[i] !== 1) continue;
    const hot = (c > 0 && st[i - 1] === 2) || (c < C - 1 && st[i + 1] === 2) ||
      (r > FL.fuelTop && st[i - C] === 2) || (r < R - 1 && st[i + C] === 2);
    if (!hot) continue;
    s.pre[i] += dtS;
    if (s.pre[i] >= (r === FL.fuelTop ? delaySurf : delaySurf * 2.5)) flIgnite(s, i);
  }
  let anyActive = false;
  for (let i = 0; i < st.length; i++) {
    if (st[i] === 2) {
      anyActive = true;
      s.burn[i] += dtS * (!s.ug && flState.vent ? 2.6 : 1);
      if (s.burn[i] >= flBurnDur(s, i)) {
        if (flState.cool && flHash(i % C, (i / C) | 0) < 0.4) { st[i] = 4; s.cool[i] = 26; }
        else { st[i] = 3; if (s.selfExt[i]) s.early[i] = 1; }
      }
    } else if (st[i] === 4) {
      anyActive = true; s.cool[i] -= dtS;
      if (s.cool[i] <= 0) { st[i] = 3; if (s.selfExt[i]) s.early[i] = 1; }
    }
  }
  return anyActive;
}
function flMkPart(s, kind, x, y, inten) {
  const R = Math.random;
  if (kind === 'flame') return s.ug
    ? { kind, x, y, vx: 0, vy: 0, age: 0, life: .9 + R() * .8, size: 13 + R() * 13, seed: R() * 9, inten }
    : { kind, x: x + (R() - .5) * 5, y: y - 2, vx: (R() - .5) * 9, vy: -(42 + R() * 48), age: 0, life: .8 + R() * .6, size: 12 + R() * 11, seed: R() * 9, inten };
  if (kind === 'smoke') return s.ug
    ? { kind, x, y: y - 4, vx: (R() - .5) * 5, vy: (R() - .5) * 4, age: 0, life: 13 + R() * 10, size: 4 + R() * 4, seed: R() * 9, inten: 1 }
    : { kind, x, y: y - 4, vx: (R() - .5) * 7, vy: -(22 + R() * 20), age: 0, life: 2.4 + R() * 1.4, size: 3.5 + R() * 3, seed: R() * 9, inten: 1 };
  return { kind, x, y: y - 2, vx: (R() - .5) * 3, vy: s.ug ? -1 : -7, age: 0, life: 1.6 + R() * 1.2, size: 3 + R() * 3, seed: R() * 9, inten: .6 };
}
function flParticles(s, dt) {
  const C = FL.cols, st = s.state;
  s.geom = flBurnGeom(s);
  const flameP = s.ug ? .55 : .55 * (1 - .75 * flState.ventK);
  for (let r = FL.fuelTop; r < FL.rows; r++) for (let c = 0; c < C; c++) {
    const i = r * C + c; if (st[i] !== 2) continue;
    const inten = Math.sin(Math.PI * Math.min(1, s.burn[i] / flBurnDur(s, i)));
    const x = FL.ox + c * FL.cell + FL.cell / 2, y = FL.oy + r * FL.cell;
    if (Math.random() < flameP) {
      const p = flMkPart(s, 'flame', x, y, inten);
      if (s.ug && s.geom) {
        /* microgravity flame particles fill a disc around the burn centre —
           no upward drift, so the flame reads as a round ball */
        const a = Math.random() * 6.2832, rr = s.geom.R * Math.sqrt(Math.random()) * .95;
        p.x = s.geom.cx + Math.cos(a) * rr; p.y = s.geom.cy + Math.sin(a) * rr;
      }
      s.parts.push(p);
    }
    if (Math.random() < .20) s.parts.push(flMkPart(s, 'smoke', x, y, inten));
  }
  if (flState.cool) for (let i = 0; i < st.length; i++)
    if (st[i] === 4 && Math.random() < .05) s.parts.push(flMkPart(s, 'cool', FL.ox + (i % C) * FL.cell + 3, FL.oy + ((i / C) | 0) * FL.cell, .5));
  if (s.parts.length > 480) s.parts.splice(0, s.parts.length - 480);
  const ventK = s.ug ? 0 : flState.ventK;
  for (let k = s.parts.length - 1; k >= 0; k--) {
    const p = s.parts[k]; p.age += dt;
    if (p.age >= p.life) { s.parts.splice(k, 1); continue; }
    if (s.ug && p.kind === 'flame') {
      /* held in the disc by a gentle pull to the centre + radial jitter */
      const g = s.geom;
      if (g) { p.vx += (g.cx - p.x) * 2.2 * dt + (Math.random() - .5) * 30 * dt; p.vy += (g.cy - p.y) * 2.2 * dt + (Math.random() - .5) * 30 * dt; }
      const damp = Math.exp(-5 * dt); p.vx *= damp; p.vy *= damp;
    } else if (s.ug) {
      p.vx += (Math.random() - .5) * 22 * dt; p.vy += (Math.random() - .5) * 22 * dt;
      p.vx *= .982; p.vy *= .982;
    } else if (p.kind === 'flame') {
      const tgt = -185 * (1 - ventK) - 8;
      p.vy += (tgt - p.vy) * Math.min(1, dt * 3.2);
      p.x += Math.sin(p.age * 7 + p.seed) * 13 * dt;
    } else if (p.kind === 'smoke') {
      const tgt = -64 * (1 - ventK) - 4;
      p.vy += (tgt - p.vy) * Math.min(1, dt * 2.2);
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.y < 4 || p.x < 2 || p.x > 468) s.parts.splice(k, 1);
  }
}
/* Fuel surface as ONE smooth band — a subtle vertical gradient, a thin
   lighter top edge, and smooth washes for the burned and cool extents.
   No per-cell fills anywhere, so no speckled pixel blocks can show. */
function flDrawGround(s) {
  const ctx = s.ctx, C = FL.cols, st = s.state;
  const x0 = FL.ox, x1 = FL.ox + C * FL.cell;
  const top = FL.oy + FL.fuelTop * FL.cell, bot = FL.oy + FL.rows * FL.cell;
  const gr = ctx.createLinearGradient(0, top, 0, bot);
  gr.addColorStop(0, '#503d1e'); gr.addColorStop(.35, '#3a2a12'); gr.addColorStop(1, '#221605');
  ctx.fillStyle = gr; ctx.fillRect(x0, top, x1 - x0, bot - top);
  let bMin = 1e9, bMax = -1, cMin = 1e9, cMax = -1;
  for (let r = FL.fuelTop; r < FL.rows; r++) for (let c = 0; c < C; c++) {
    const v = st[r * C + c];
    if (v === 3) { if (c < bMin) bMin = c; if (c > bMax) bMax = c; }
    else if (v === 4) { if (c < cMin) cMin = c; if (c > cMax) cMax = c; }
  }
  /* burned / cool washes feather out at both ends — a horizontal gradient
     over a span extended past the extent (clipped to the band), so no
     straight vertical edge or rectangular block can appear */
  const wash = (minC, maxC, rgb, alpha) => {
    const fade = FL.cell * 3;
    const wx0 = FL.ox + minC * FL.cell - fade, wx1 = FL.ox + (maxC + 1) * FL.cell + fade;
    const wg = ctx.createLinearGradient(wx0, 0, wx1, 0);
    const f = fade / (wx1 - wx0);
    wg.addColorStop(0, `rgba(${rgb},0)`);
    wg.addColorStop(f, `rgba(${rgb},${alpha})`);
    wg.addColorStop(1 - f, `rgba(${rgb},${alpha})`);
    wg.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = wg; ctx.fillRect(wx0, top, wx1 - wx0, bot - top);
  };
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, top, x1 - x0, bot - top); ctx.clip();
  if (bMax >= 0) wash(bMin, bMax, '8,8,12', .52);
  if (cMax >= 0) wash(cMin, cMax, '125,180,250', .15);
  ctx.restore();
  ctx.fillStyle = 'rgba(216,170,96,.5)'; ctx.fillRect(x0, top, x1 - x0, 2);
  /* warm ember glow hugging the surface under each burning run */
  const SPR = flSprites();
  ctx.globalCompositeOperation = 'lighter';
  for (const cl of flBurnClusters(s)) {
    const w = Math.max(60, cl.wPx * 1.5);
    ctx.globalAlpha = .36;
    ctx.drawImage(SPR.earth, cl.cx - w / 2, top - 11, w, 22);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
/* One continuous teardrop silhouette: narrow base at the surface, widest
   in the lower-middle, tapering to a point. Deliberately asymmetric: the
   spine leans one way (a fixed direction per flame, from the seed) and
   grows with height, the left edge peaks lower than the right, and each
   edge carries its own uneven noise deformation — so the silhouette can
   never read as a mirrored, geometric shape or a round glow orb. */
function flTeardropPath(ctx, cx, baseY, wBody, h, seed, t, sway) {
  const N = 16;
  const lean = Math.sin(seed * 7.31) * 11;
  const peakL = .34 + .07 * Math.sin(seed * 3.7);
  const peakR = .47 - .07 * Math.sin(seed * 3.7);
  const half = (u, peak) => {
    const grow = u <= peak ? .40 + .60 * Math.sin((u / peak) * Math.PI / 2) : Math.pow(1 - (u - peak) / (1 - peak), .72);
    return (wBody / 2) * Math.max(.03, grow);
  };
  const spine = u => cx + (lean + sway) * u * u + flNoise(seed + u * 3.1, t * .9) * 6 * u;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    /* edge noise grows with height — the base stays planted while the
       edges and tip flicker organically — plus a fine high-frequency
       term so the boundary never reads as a smooth geometric curve */
    const u = i / N, j = 1 + (.12 + .19 * u) * flNoise(seed * 2 + u * 6.7, t * 1.25) + .06 * flNoise(seed * 3.3 + u * 13.0, t * 2.2);
    pts.push([spine(u) - half(u, peakL) * j, baseY - u * h]);
  }
  for (let i = N; i >= 0; i--) {
    const u = i / N, j = 1 + (.12 + .19 * u) * flNoise(seed * 2 + 40 + u * 6.7, t * 1.25) + .06 * flNoise(seed * 3.3 + 51 + u * 13.0, t * 2.2) + .10 * Math.sin(u * Math.PI);
    pts.push([spine(u) + half(u, peakR) * j, baseY - u * h]);
  }
  ctx.beginPath();
  ctx.moveTo((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  ctx.closePath();
}
function flFlameLayer(ctx, cx, baseY, wBody, h, seed, t, sway, sx, sy, stops, alpha) {
  ctx.save();
  ctx.translate(cx, baseY); ctx.scale(sx, sy); ctx.translate(-cx, -baseY);
  flTeardropPath(ctx, cx, baseY, wBody, h, seed, t, sway);
  const gr = ctx.createLinearGradient(0, baseY, 0, baseY - h);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  ctx.globalAlpha = alpha; ctx.fillStyle = gr; ctx.fill();
  ctx.restore();
}
/* Earth flame for one burn cluster: layered teardrops, outer amber to a
   bright ELONGATED yellow-white core sitting low. One continuous body per
   cluster — nothing is drawn above or outside it (no tip fragments);
   wide bodies and a generous cluster merge make neighbours read as a
   single wall of flame, not separate balls. Each layer's gradient has
   five stops so core→yellow→amber→orange blends without banding, and the
   foot is sunk into the surface so the base grows out of the ember glow. */
function flDrawEarthFlame(ctx, cl, surfY, t, ventDim) {
  const seed = cl.cx * .37 + 3;
  const flick = 1 + .055 * flNoise(seed, t);
  const h = Math.min(300, Math.max(135, cl.wPx * 1.3 + 95)) * flick;
  const wBody = Math.min(178, Math.max(48, cl.wPx * .92 + 38));
  const sway = flNoise(seed + 90, t * .55) * 7;
  /* base sunk into the surface band — the bottom of every layer hides in
     the ground/ember glow, so the flame looks planted, not cut off */
  const baseY = surfY + 8;
  ctx.globalCompositeOperation = 'lighter';
  /* faint wide atmospheric glow behind the body — atmosphere only, far
     too dim and broad to read as a blob */
  const gw = wBody * 2.2, gh = h * 1.02;
  ctx.globalAlpha = .13 * ventDim;
  ctx.drawImage(flSprites().earth, cl.cx - gw / 2, baseY - gh * .88, gw, gh);
  /* low wide foot glow — blends the flame's base into the surface embers */
  const fw = wBody * 1.55;
  ctx.globalAlpha = .20 * ventDim;
  ctx.drawImage(flSprites().earth, cl.cx - fw / 2, surfY - 13, fw, 27);
  /* Each layer gets its own noise seed so the silhouettes deform
     independently instead of nesting like contour lines. Iteration 4:
     the layers are FEATHERED into each other — the outer silhouette is
     drawn again slightly expanded at low alpha (and the amber layer
     likewise), so its edge falls off softly instead of tracing a hard
     contour, and the inner layers sit wider with gentler alphas, so the
     four shapes melt into one flame with internal colour variation
     rather than reading as stacked transparent leaves. */
  const stopsOuter = [[0, 'rgba(255,122,20,.46)'], [.22, 'rgba(250,96,12,.40)'], [.48, 'rgba(238,74,6,.30)'], [.72, 'rgba(224,56,2,.16)'], [1, 'rgba(205,44,0,0)']];
  const stopsAmber = [[0, 'rgba(255,176,44,.52)'], [.28, 'rgba(255,152,30,.42)'], [.55, 'rgba(255,128,22,.26)'], [.8, 'rgba(255,110,14,.10)'], [1, 'rgba(255,100,10,0)']];
  const stopsYellow = [[0, 'rgba(255,220,102,.56)'], [.3, 'rgba(255,202,76,.44)'], [.6, 'rgba(255,182,64,.24)'], [.85, 'rgba(255,168,46,.08)'], [1, 'rgba(255,160,40,0)']];
  flFlameLayer(ctx, cl.cx, baseY, wBody, h, seed, t, sway, 1.10, 1.06, stopsOuter, .20 * ventDim);
  flFlameLayer(ctx, cl.cx, baseY, wBody, h, seed, t, sway, 1.05, 1.03, stopsOuter, .38 * ventDim);
  flFlameLayer(ctx, cl.cx, baseY, wBody, h, seed, t, sway, 1, 1, stopsOuter, .78 * ventDim);
  flFlameLayer(ctx, cl.cx, baseY, wBody, h, seed + 3.7, t, sway, .92, .97, stopsAmber, .16 * ventDim);
  flFlameLayer(ctx, cl.cx, baseY, wBody, h, seed + 3.7, t, sway, .86, .93, stopsAmber, .20 * ventDim);
  flFlameLayer(ctx, cl.cx, baseY, wBody, h, seed + 3.7, t, sway, .80, .88,
    stopsAmber, .50 * ventDim);
  flFlameLayer(ctx, cl.cx, baseY, wBody, h, seed + 7.4, t, sway, .68, .78, stopsYellow, .16 * ventDim);
  flFlameLayer(ctx, cl.cx, baseY, wBody, h, seed + 7.4, t, sway, .60, .70, stopsYellow, .48 * ventDim);
  flFlameLayer(ctx, cl.cx, baseY, wBody, h, seed + 11.1, t, sway, .36, .52,
    [[0, 'rgba(255,250,220,.90)'], [.35, 'rgba(255,238,168,.62)'], [.65, 'rgba(255,226,130,.34)'], [.88, 'rgba(255,214,102,.12)'], [1, 'rgba(255,205,90,0)']], .72 * ventDim);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
/* The microgravity envelope as a noise-deformed closed path: the radius
   wobbles ±5% around the circle, the wobble field is built from sin/cos of
   the angle so it is continuous around the full turn (no seam), and it
   evolves slowly in time — the boundary is never a perfect circle and
   never jagged. Rendering only. */
function flUGBallPath(ctx, cx, cy, R, t) {
  const N = 30, pts = [];
  for (let i = 0; i < N; i++) {
    const a = i / N * 6.2832;
    const wob = flNoise(31.7 + 2.3 * Math.sin(a + 1.1) + 1.9 * Math.cos(a - .6), t * .4);
    const r = R * (1 + .05 * wob);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  ctx.beginPath();
  ctx.moveTo((pts[0][0] + pts[N - 1][0]) / 2, (pts[0][1] + pts[N - 1][1]) / 2);
  for (let i = 0; i < N; i++) {
    const p = pts[i], q = pts[(i + 1) % N];
    ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  ctx.closePath();
}
/* Microgravity flame: a VOLUME of burning gas, not a solid ball. There is
   deliberately NO rim stroke and NO perfect circle — the envelope path
   wobbles gently, the fill is a radial gradient (white-blue luminous core
   → cyan → deep blue) whose own falloff reaches transparency at the edge,
   a soft halo spills beyond the envelope, and three LARGE, very soft glow
   masses drift slowly inside (clipped to the envelope) so the luminosity
   is organic at a big scale — never the small-spot mottling of iteration
   2, never a flat planet surface. Drawn mostly source-over so the centre
   cannot blow out. The soft pale core is added after the particles
   (flDrawUGCore). */
function flDrawUGBall(ctx, g, t, ventDim) {
  const SPR = flSprites();
  const breathe = 1 + .03 * flNoise(11.3, t * .55);
  const R = g.R * breathe, cx = g.cx, cy = g.cy;
  /* soft radial halo extending well beyond the envelope, fading out */
  ctx.globalCompositeOperation = 'lighter';
  const dh = R * 4.4;
  ctx.globalAlpha = .06 * ventDim;
  ctx.drawImage(SPR.ug, cx - dh / 2, cy - dh / 2, dh, dh);
  const dh2 = R * 2.7;
  ctx.globalAlpha = .05 * ventDim;
  ctx.drawImage(SPR.ug, cx - dh2 / 2, cy - dh2 / 2, dh2, dh2);
  ctx.globalCompositeOperation = 'source-over';
  /* the envelope itself */
  flUGBallPath(ctx, cx, cy, R, t);
  const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  gr.addColorStop(0, 'rgba(200,228,255,.82)');
  gr.addColorStop(.28, 'rgba(148,196,255,.68)');
  gr.addColorStop(.52, 'rgba(92,152,252,.60)');
  gr.addColorStop(.74, 'rgba(58,108,232,.52)');
  gr.addColorStop(.88, 'rgba(42,82,212,.26)');
  gr.addColorStop(1, 'rgba(30,60,195,0)');
  ctx.globalAlpha = (.95 + .05 * flNoise(4.2, t * .55)) * ventDim;
  ctx.fillStyle = gr; ctx.fill();
  /* large soft glow masses drifting slowly inside the envelope */
  ctx.save();
  flUGBallPath(ctx, cx, cy, R, t);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const sd = 5.1 + i * 7.7;
    const ang = t * .06 * (1 + i * .6) + sd;
    const dist = R * (.15 + .11 * (0.5 + 0.5 * flNoise(sd, t * .23)));
    const mx = cx + Math.cos(ang) * dist * 1.35, my = cy + Math.sin(ang) * dist * .8;
    const md = R * (1.05 + .3 * i);
    ctx.globalAlpha = (.15 - .03 * i) * ventDim;
    ctx.drawImage(SPR.ugSoft, mx - md / 2, my - md / 2, md, md);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  return { cx, cy, R };
}
function flDrawUGCore(ctx, ball, ventDim) {
  const { cx, cy, R } = ball;
  const cr = R * .32;
  const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
  cg.addColorStop(0, 'rgba(230,243,255,.78)');
  cg.addColorStop(.6, 'rgba(182,215,255,.36)');
  cg.addColorStop(1, 'rgba(160,200,255,0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = .36 * ventDim;
  ctx.beginPath(); ctx.arc(cx, cy, cr, 0, 6.2832); ctx.fillStyle = cg; ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  /* NO rim stroke (removed in iteration 4): a hard circular outline is
     what made the sphere read as a planet / glass ball — the spherical
     read now comes only from the envelope's own glowing falloff */
  ctx.globalAlpha = 1;
}
function flDraw(s) {
  const ctx = s.ctx, SPR = flSprites();
  const t = performance.now() / 1000;
  ctx.clearRect(0, 0, 470, 400);
  flDrawGround(s);
  const g = s.geom || flBurnGeom(s);
  const ventDim = s.ug ? 1 : 1 - .8 * flState.ventK;
  let ball = null, clusters = null, clamps = null;
  const surfY = g ? g.surfY : FL.oy + FL.fuelTop * FL.cell;
  if (s.ug) {
    /* ONE ball, on the principal burning run — a separated secondary run
       never gets a ball of its own, only surface ember glow */
    const pg = flPrincipalGeom(s);
    if (pg) ball = flDrawUGBall(ctx, pg, t, ventDim);
  } else if (g) {
    clusters = flBurnClusters(s);
    for (const cl of clusters) flDrawEarthFlame(ctx, cl, surfY, t, ventDim);
    /* silhouette regions the texture particles may render inside */
    clamps = clusters.map(cl => {
      const wB = Math.min(178, Math.max(48, cl.wPx * .92 + 38));
      const hC = Math.min(300, Math.max(135, cl.wPx * 1.3 + 95));
      return { cx: cl.cx, wB, hC, top: surfY - hC * 1.02 };
    });
  }
  for (const p of s.parts) {
    const f = p.age / p.life, fade = f < .15 ? f / .15 : 1 - (f - .15) / .85;
    if (p.kind === 'flame') {
      /* per-particle pseudo-noise: size and brightness shimmer unevenly,
         so the flame boundary is never a uniform pulse */
      const nz = flNoise(p.seed * 3.7, t * 1.4), na = 1 + .18 * flNoise(p.seed * 5.3 + 9, t * 1.4);
      ctx.globalCompositeOperation = 'lighter';
      if (s.ug) {
        /* whisper texture inside the ONE ball only — a soft sprite with
           no hot centre at very low alpha, so the interior stays a smooth
           layered glow (never mottled) and no particle can ever render
           as a detached second ball outside it */
        if (ball) {
          const dx = p.x - ball.cx, dy = p.y - ball.cy;
          if (dx * dx + dy * dy <= Math.pow(ball.R * 1.05, 2)) {
            const d = p.size * (1.2 + .35 * Math.sin(Math.PI * f)) * (1 + .16 * nz);
            ctx.globalAlpha = Math.max(0, .07 * fade * (.45 + .55 * p.inten) * ventDim * na);
            ctx.drawImage(SPR.ugSoft, p.x - d / 2, p.y - d / 2, d, d);
          }
        }
      } else {
        /* texture tongues render only inside a flame body's silhouette
           region — a particle that has risen past the tip is skipped, so
           nothing can float detached above the flame */
        let inside = false;
        if (clamps) for (const cm of clamps) {
          if (p.y > surfY + 6 || p.y < cm.top) continue;
          /* the allowed half-width follows the teardrop's own profile at
             the particle's height — texture hugs the narrow foot instead
             of spreading into separate flamelets beside it */
          const u = Math.min(1, Math.max(0, (surfY + 4 - p.y) / cm.hC));
          const grow = u <= .4 ? .40 + .60 * Math.sin((u / .4) * Math.PI / 2) : Math.pow(1 - (u - .4) / .6, .72);
          if (Math.abs(p.x - cm.cx) <= (cm.wB / 2) * Math.max(.05, grow) * 1.3 + 10) { inside = true; break; }
        }
        if (inside) {
          const d = p.size * .85 * (1.15 + .6 * Math.sin(Math.PI * Math.min(1, f * 1.12))) * (1 + .16 * nz);
          const dh = d * 1.9;
          ctx.globalAlpha = Math.max(0, .26 * fade * (.45 + .55 * p.inten) * ventDim * na);
          ctx.drawImage(SPR.earth, p.x - d / 2, p.y - dh / 2, d, dh);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    } else if (p.kind === 'smoke') {
      /* microgravity smoke that has sunk below the surface line only
         renders while it still hugs the ball — no stray grey pools
         sitting on the ground band far from the flame */
      if (s.ug && p.y > surfY + 4 && !(ball && Math.abs(p.x - ball.cx) <= ball.R * 2.2)) continue;
      const d = (p.size + f * 9) * 3.4;
      ctx.globalAlpha = .5 * (f < .2 ? f / .2 : 1 - Math.max(0, f - .55) / .45);
      ctx.drawImage(SPR.smoke, p.x - d / 2, p.y - d / 2, d, d);
      ctx.globalAlpha = 1;
    } else {
      const d = p.size * 2.6;
      ctx.globalAlpha = .5 * fade;
      ctx.drawImage(SPR.cool, p.x - d / 2, p.y - d / 2, d, d);
      ctx.globalAlpha = 1;
    }
  }
  if (ball) flDrawUGCore(ctx, ball, ventDim);
}
/* detector's eye — levels are measured SAME-R medians from data/detection.json */
function flDetMedian(mat) { const m = (DET.by_material || []).find(b => b.material === mat); return m ? m.obsc_drop_med_V : 0; }
function flFmtV(v) { return (Math.round(v * 1000) / 1000).toFixed(3); }
function flDetUpdate(dt) {
  const smoke = flUG.parts.reduce((a, p) => a + (p.kind === 'smoke' ? 1 : 0), 0);
  const target = flDetMedian(flState.smokeMat) * Math.min(1, smoke / 240);
  flState.det += (target - flState.det) * Math.min(1, dt * 1.6);
  const full = flDetMedian('Silicone') || 0.3;
  const fill = $('#fl-meter-fill'), val = $('#fl-meter-val');
  if (fill) fill.style.width = Math.min(100, flState.det / full * 100) + '%';
  if (val) val.textContent = flFmtV(flState.det) + ' V';
}
function flDetNote() {
  const v = flDetMedian(flState.smokeMat), full = flDetMedian('Silicone');
  let txt = `Smoke is simulated; the response levels are the measured SAME-R medians. ${flState.smokeMat} median: ${flFmtV(v)} V (data/detection.json) · meter full scale ${flFmtV(full)} V (Silicone, the strongest responder).`;
  if (flState.smokeMat === 'Kapton' || flState.smokeMat === 'Teflon')
    txt += ' Watch the microgravity smoke pile up while the needle stays at the floor — the detector miss, demonstrated.';
  $('#fl-meter-note').textContent = txt;
}
function flRateText(o2) {
  if (o2 === 35) return '0.092 cm/s — measured (PSI-108)';
  if (o2 === 50) return '0.547 cm/s — measured (PSI-108)';
  if (o2 < 35) return '0.092 cm/s — at/below the lowest measured anchor (35%), shown at the 35% measured rate';
  return `\u2248${flRate(o2).toFixed(3)} cm/s — interpolated between measured anchors`;
}
function flCaption() {
  const parts = [];
  if (flState.vent) parts.push('Ventilation stopped: on Earth the flame gutters and dies down without its airflow. In microgravity the flame persists — NASA\u2019s Guide records that a \u00b5g flame does not self-extinguish when ventilation stops.');
  if (flState.cool) parts.push('Cool flame on: some burned-out cells drop into a faint pale state — PSI-117 records cool flames still burning invisibly after visible extinction.');
  $('#fl-caption').textContent = parts.length ? parts.join(' ') : 'Ventilation on: moving air feeds both flames.';
}
function flFuelStats() {
  const f = flState.fuel, bin = flBin(f);
  let h = '';
  if (f === 'Methanol') {
    const m = supMatch('Methanol', 21, 14.7), ext = m.filter(r => r.out === 'Extinction').length;
    h += `<p><strong>Methanol — cabin conditions (21% O\u2082 \u00b7 14.7 psia):</strong> ${ext} of ${m.length} matched FLEX flames extinguished — the Suppression View figure, from the same matched rows.</p>`;
  } else {
    h += `<p><strong>Heptane — cabin conditions (21% O\u2082 \u00b7 14.7 psia):</strong> no figure stored in the shipped suppression data, so none is printed.</p>`;
  }
  if (bin) h += `<p><strong>${f} — stored FLEX record, 20\u201324% O\u2082 bin</strong> (data/suppression.json): ${bin.n} rows \u00b7 ${bin.extinguished} extinguished (${(bin.share * 100).toFixed(1)}%). This bin\u2019s share sets ${f}\u2019s burn-out tendency in the simulation.</p>`;
  h += `<p class="chart-note">Full per-bin record: Suppression View. The PSI-108 spread anchors do not change with fuel.</p>`;
  $('#fl-fuel-stats').innerHTML = h;
}
function flSetFuel(f) {
  flState.fuel = f;
  const bin = flBin(f); if (bin) flState.pExt = bin.share;
  [flEarth, flUG].forEach(s => {
    if (!s) return;
    for (let i = 0; i < s.state.length; i++)
      if (s.state[i] === 1) s.selfExt[i] = flHash(i % FL.cols, (i / FL.cols) | 0) < flState.pExt ? 1 : 0;
  });
  flFuelStats();
}
function flMoon(on) {
  flState.moon = on;
  $('#fl-moon').style.display = on ? 'block' : 'none';
  $('#fl-moon-btn').classList.toggle('active', on);
  $('#fl-fig-ug').classList.toggle('fl-emph', on);
  if (on) { const s = $('#fl-o2'); s.value = 34; s.dispatchEvent(new Event('input')); }
}
function flTick(ts) {
  requestAnimationFrame(flTick);
  const dt = Math.min(.05, flLast ? (ts - flLast) / 1000 : .016); flLast = ts;
  const sec = $('#sec-flamelab');
  if (!sec || !sec.classList.contains('active') || document.hidden) return;
  flState.ventK += ((flState.vent ? 1 : 0) - flState.ventK) * Math.min(1, dt * 1.8);
  const a = flStep(flEarth, dt), b = flStep(flUG, dt);
  flDraw(flEarth); flDraw(flUG); flDetUpdate(dt);
  if (!a && !b) { flState.doneT += dt; if (flState.doneT > 4) { flResetSim(flEarth); flResetSim(flUG); flState.det = 0; flState.doneT = 0; } }
  else flState.doneT = 0;
}
function initFlameLab() {
  const ec = $('#fl-earth'), uc = $('#fl-ug'); if (!ec || !uc || !SUP || !DET) return;
  const binM = flBin('Methanol'); if (binM) flState.pExt = binM.share;
  flEarth = flNewSim(false, ec); flUG = flNewSim(true, uc);
  flReduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  flFuelStats(); flDetNote(); flCaption();
  const slider = $('#fl-o2');
  slider.addEventListener('input', () => {
    flState.o2 = parseFloat(slider.value);
    $('#fl-o2-val').textContent = slider.value + '% O\u2082';
    $('#fl-rate').textContent = flRateText(flState.o2);
    if (flState.moon && flState.o2 !== 34) flMoon(false);
  });
  flState.o2 = parseFloat(slider.value);
  $('#fl-rate').textContent = flRateText(flState.o2);
  $('#fl-vent').addEventListener('click', e => {
    flState.vent = !flState.vent;
    e.currentTarget.classList.toggle('active', flState.vent);
    e.currentTarget.textContent = flState.vent ? 'Restart ventilation' : 'Stop ventilation';
    flCaption();
  });
  $('#fl-cool').addEventListener('click', e => {
    flState.cool = !flState.cool;
    e.currentTarget.classList.toggle('active', flState.cool);
    flCaption();
  });
  $('#fl-reset').addEventListener('click', () => { flResetSim(flEarth); flResetSim(flUG); flState.det = 0; flState.doneT = 0; });
  $('#fl-moon-btn').addEventListener('click', () => flMoon(!flState.moon));
  $$('.fl-fuel').forEach(b => b.addEventListener('click', () => {
    $$('.fl-fuel').forEach(x => x.classList.remove('active')); b.classList.add('active'); flSetFuel(b.dataset.fuel);
  }));
  $$('.fl-smoke').forEach(b => b.addEventListener('click', () => {
    $$('.fl-smoke').forEach(x => x.classList.remove('active')); b.classList.add('active');
    flState.smokeMat = b.dataset.mat; flDetNote();
  }));
  if (flReduced) {
    const mid = FL.fuelTop * FL.cols + (FL.cols >> 1);
    [flEarth, flUG].forEach(s => { [-2, -1, 1, 2].forEach(d => flIgnite(s, mid + d)); });
    flDraw(flEarth); flDraw(flUG);
    $('#fl-rm-note').style.display = 'block';
    return;
  }
  flDraw(flEarth); flDraw(flUG);
  requestAnimationFrame(flTick);
}

init().catch(e => { document.body.insertAdjacentHTML('afterbegin', '<div style="padding:14px;background:#5b1a1a;color:#fff">Failed to load data files: ' + e.message + ' — serve this folder over HTTP (e.g. python3 -m http.server) rather than file://.</div>'); });
