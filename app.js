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
  fill('env-p', fmt(MODEL.envelope.pressure_psi[0]) + '–' + fmt(MODEL.envelope.pressure_psi[1]));
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
    ['Detection Panel', 'detection'], ['Suppression View', 'suppression'], ['Safe Predictor', 'predictor'],
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
  { text: 'The gap in one number: solid cabin materials were never tested above 22.2% O₂. The Moon cabin will run at 34%.',
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
  renderPsi117(); renderPsd(); renderBurn(); renderOverlap(); initArchive();
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

init().catch(e => { document.body.insertAdjacentHTML('afterbegin', '<div style="padding:14px;background:#5b1a1a;color:#fff">Failed to load data files: ' + e.message + ' — serve this folder over HTTP (e.g. python3 -m http.server) rather than file://.</div>'); });
