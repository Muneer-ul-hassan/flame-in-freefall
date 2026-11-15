/* FIRENEX — research-discovery layer. Reads only the project's own data/*.json and docs/claims.md.
   No network calls except same-origin fetches; no keys; no generative AI. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = n => Number(n).toLocaleString('en-US');
  const go = id => { const b = $('#nav button[data-sec="' + id + '"]'); if (b) b.click(); };
  const EV = (c, t) => `<span class="ev ev-${c}" title="${esc(t || '')}">${c}</span>`;
  const doiLink = d => d ? `<a href="https://doi.org/${esc(d)}" target="_blank" rel="noopener">doi:${esc(d)}</a>` : 'not recorded';
  const O2_TOL = 2, P_TOL = 3; // same matching tolerance as Cabin Check (±2 O₂ points, ±3 psia)
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- hero (decorative canvas; paused when hidden; static if reduced-motion) ---------------- */
  function hero() {
    const cv = $('#hero-canvas'); if (!cv) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    let W = 0, H = 0, dpr = 1, raf = 0, visible = true, px = 0, py = 0, tx = 0, ty = 0;
    const t0 = performance.now();
    const stars = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.2 + .2, p: Math.random() * 6.28, z: Math.random() }));
    const parts = Array.from({ length: 48 }, (_, i) => ({ o: i % 3, a: Math.random() * 6.28, s: (.12 + Math.random() * .22) * (i % 2 ? 1 : -1), r: .6 + Math.random() * .9 }));
    function size() {
      const b = cv.getBoundingClientRect(); dpr = Math.min(devicePixelRatio || 1, 2);
      W = b.width; H = b.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduceMotion) draw(2);
    }
    function blob(x, y, r, c0) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c0); g.addColorStop(1, 'rgba(10,11,14,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
    function draw(t) {
      px += (tx - px) * .05; py += (ty - py) * .05;
      const wide = W > 800, cx = W * (wide ? .72 : .5) + px * 14, cy = H * (wide ? .5 : .88) + py * 10, R = Math.min(W, H) * (wide ? .19 : .13);
      ctx.clearRect(0, 0, W, H);
      blob(W * .3 + Math.sin(t * .11) * 60 - px * 30, H * .35 + Math.cos(t * .09) * 40, W * .55, 'rgba(91,124,250,.30)');
      blob(cx + Math.cos(t * .07) * 70, cy + Math.sin(t * .1) * 50, W * .5, 'rgba(194,65,12,.22)');
      blob(W * .9 + Math.sin(t * .08) * 40, H * .1, W * .4, 'rgba(29,33,41,.55)');
      stars.forEach(s => { const a = .25 + .5 * (.5 + .5 * Math.sin(t * .8 + s.p)); ctx.fillStyle = `rgba(243,239,232,${a})`; ctx.beginPath(); ctx.arc(s.x * W - px * 18 * s.z, s.y * H - py * 12 * s.z, s.r, 0, 6.283); ctx.fill(); });
      const rx = [2.1, 2.9, 3.8].map(k => R * k);
      rx.forEach((r, i) => { ctx.strokeStyle = 'rgba(236,232,224,.13)'; ctx.setLineDash([2, 7]); ctx.beginPath(); ctx.ellipse(cx, cy, r, r * .32, -.45 + i * .3, 0, 6.283); ctx.stroke(); });
      ctx.setLineDash([]);
      const pos = p => { const r = rx[p.o], a = p.a + t * p.s, rot = -.45 + p.o * .3, x = Math.cos(a) * r, y = Math.sin(a) * r * .32; return { x: cx + x * Math.cos(rot) - y * Math.sin(rot), y: cy + x * Math.sin(rot) + y * Math.cos(rot), back: Math.sin(a) < 0 }; };
      const dots = back => parts.forEach(p => { const q = pos(p); if (q.back !== back) return; const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, 6 * p.r); g.addColorStop(0, back ? 'rgba(236,232,224,.55)' : 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,196,138,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, 6 * p.r, 0, 6.283); ctx.fill(); });
      dots(true);
      blob(cx, cy, R * 3.2, 'rgba(255,122,47,.20)');
      // microgravity flame: a near-spherical, slowly breathing luminous front (conceptual)
      ctx.beginPath();
      for (let i = 0; i <= 72; i++) { const a = i / 72 * 6.283, w = 1 + .016 * Math.sin(a * 3 + t * .9) + .009 * Math.sin(a * 5 - t * 1.3); const x = cx + Math.cos(a) * R * w, y = cy + Math.sin(a) * R * w; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.closePath();
      const g = ctx.createRadialGradient(cx - R * .15, cy - R * .2, R * .05, cx, cy, R * 1.05);
      g.addColorStop(0, 'rgba(255,252,245,.98)'); g.addColorStop(.28, 'rgba(255,170,90,.92)'); g.addColorStop(.62, 'rgba(194,65,12,.78)'); g.addColorStop(.9, 'rgba(150,40,10,.45)'); g.addColorStop(1, 'rgba(150,40,10,0)');
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(255,196,138,.35)'; ctx.lineWidth = 1.2; ctx.stroke();
      dots(false);
    }
    function frame(now) { draw((now - t0) / 1000); if (visible && !document.hidden) raf = requestAnimationFrame(frame); }
    size(); addEventListener('resize', size);
    if (reduceMotion) { draw(2); return; }
    $('#hero').addEventListener('pointermove', e => { const b = cv.getBoundingClientRect(); tx = (e.clientX - b.left) / b.width - .5; ty = (e.clientY - b.top) / b.height - .5; });
    new IntersectionObserver(es => { visible = es[0].isIntersecting && $('#sec-home').classList.contains('active'); if (visible) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); } }).observe(cv);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); } });
    $$('#nav button').forEach(b => b.addEventListener('click', () => { visible = b.dataset.sec === 'home'; if (visible) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); } }));
    raf = requestAnimationFrame(frame);
  }

  /* ---------------- data ---------------- */
  let INV = [], ROWS = [], STATS = {}, DET = null, MODEL = null, CLAIMS = [];
  const rangeOf = (vals) => vals.length ? [Math.min(...vals.map(v => v[0])), Math.max(...vals.map(v => v[1]))] : null;
  function stats() {
    INV.forEach(i => {
      const rs = ROWS.filter(r => r.acc === i.accession);
      const o2 = rs.filter(r => Array.isArray(r.o2)).map(r => r.o2), p = rs.filter(r => Array.isArray(r.p)).map(r => r.p);
      const fl = rs.filter(r => typeof r.flow === 'number').map(r => [r.flow, r.flow]);
      const out = {}; rs.forEach(r => { if (r.out != null) out[r.out] = (out[r.out] || 0) + 1; });
      STATS[i.accession] = { n: rs.length, o2, p, fl, o2r: rangeOf(o2), pr: rangeOf(p), flr: rangeOf(fl), out, rows: rs };
    });
  }
  const fmtR = (r, u) => r ? (r[0] === r[1] ? `${+r[0].toFixed(2)}${u}` : `${+r[0].toFixed(2)}–${+r[1].toFixed(2)}${u}`) : null;
  const NA = '<span style="color:#f2b8b5;font-style:italic">not recorded</span>';
  const evOf = i => i.accession === 'PSI-101' ? EV('REPORTED', 'PSI experimental-table entries as recorded') + EV('MEASURED', 'Raw SAME-R detector telemetry analysed in the Detection Panel') : EV('REPORTED', 'PSI experimental-table entries as recorded');
  const byAcc = a => INV.find(i => i.accession === a);

  function inspector(i, extra) {
    const s = STATS[i.accession], mats = (i.materials || []);
    const outs = Object.keys(s.out).length ? Object.entries(s.out).map(([k, v]) => `${esc(k)} ×${v}`).join(', ') : NA;
    return `<div class="mono" style="color:var(--sky);font-size:12px">${esc(i.accession)} · ${esc(i.family_label)}</div>
      <h3>${esc(i.name)}</h3><div>${evOf(i)}</div>
      <dl><dt>Test rows</dt><dd>${nf(s.n)} (PSI tables: ${esc((i.tables || []).join('; ') || 'n/a')})</dd>
      <dt>Material / fuel</dt><dd>${mats.length ? esc(mats.slice(0, 8).join(', ')) + (mats.length > 8 ? ` +${mats.length - 8} more` : '') : NA}</dd>
      <dt>O₂ recorded</dt><dd>${fmtR(s.o2r, ' %') || NA}${s.o2r ? ` <span class="mono" style="color:var(--muted)">(${s.o2.length}/${s.n} rows)</span>` : ''}</dd>
      <dt>Pressure</dt><dd>${fmtR(s.pr, ' psia') || NA}${s.pr ? ` <span class="mono" style="color:var(--muted)">(${s.p.length}/${s.n} rows)</span>` : ''}</dd>
      <dt>Airflow</dt><dd>${fmtR(s.flr, ' cm/s') || NA}</dd>
      <dt>Outcomes</dt><dd>${outs}</dd>
      <dt>Gravity</dt><dd>${NA} <span style="color:var(--muted)">(no gravity field in the PSI tables used)</span></dd>
      <dt>Objective</dt><dd>Not stored in this project’s data — see the DOI.</dd>
      <dt>Source</dt><dd>${doiLink(i.doi)} · <a href="https://psi.nasa.gov" target="_blank" rel="noopener">NASA PSI</a></dd></dl>
      ${extra || ''}
      <div class="fx-btns"><button class="fx-btn" data-act="cmp" data-acc="${esc(i.accession)}">Add to compare</button><button class="fx-btn" data-act="arch">Open Archive</button></div>`;
  }
  function wireInsp(root) {
    $$('[data-act="cmp"]', root).forEach(b => b.onclick = () => { addCompare(b.dataset.acc); go('compare'); });
    $$('[data-act="arch"]', root).forEach(b => b.onclick = () => go('archive'));
    if (matchMedia('(max-width:900px)').matches) root.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  /* ---------------- Mission Discovery ---------------- */
  const MISSIONS = [
    { id: 'iss', name: 'ISS & spacecraft', o2: 21, p: 14.7, src: 'ISS cabin preset (21% O₂, 14.7 psia) — same preset as Cabin Check.',
      links: ['PSI-25', 'PSI-26', 'PSI-98', 'PSI-99', 'PSI-100', 'PSI-101', 'PSI-102', 'PSI-47', 'PSI-68', 'PSI-69', 'PSI-107'],
      note: 'Relevance is FIRENEX’s inference from each investigation’s family and recorded conditions — it is not an official NASA mission mapping, and there are no mission risk scores.' },
    { id: 'moon', name: 'Lunar habitat', o2: 34, p: 8.2, src: 'NASA-recommended exploration atmosphere: 8.2 psia, 34% O₂ (NTRS 20240003211). A recommendation, not a measurement.',
      links: ['PSI-25', 'PSI-26', 'PSI-101', 'PSI-102', 'PSI-68', 'PSI-69', 'PSI-159', 'PSI-10', 'PSI-39'],
      note: 'Solid-material tests in the data stop well below 34% O₂ (see Evidence Gap Radar). Overlap here means a recorded test row exists near the condition — not that the result transfers.' },
    { id: 'mars', name: 'Mars habitat', o2: null, p: null, src: 'No Mars habitat atmosphere is defined in this project’s sources. Enter your own O₂ / pressure to test overlap.',
      links: ['PSI-25', 'PSI-26', 'PSI-101', 'PSI-69', 'PSI-159', 'PSI-10'],
      note: 'No Mars-specific investigation exists in the data. All links are indirect context; gravity differences cannot be assessed because no partial-gravity data is available.' },
    { id: 'rover', name: 'Pressurised rover', o2: null, p: null, src: 'No rover cabin atmosphere is defined in this project’s sources. Enter your own values to test overlap.', rel: 'indirect',
      links: ['PSI-25', 'PSI-26', 'PSI-101', 'PSI-102'],
      note: 'UNKNOWN: none of the 19 investigations targets rover cabins. Entries are general cabin-material and smoke-detection context only.' }
  ];
  let mission = MISSIONS[0], msSel = null, firstDraw = true;
  const dim = (rowsVals, v, tol) => v == null ? undefined : (rowsVals.length ? rowsVals.some(r => v >= r[0] - tol && v <= r[1] + tol) : null);
  function overlap(acc, o2, p) {
    const s = STATS[acc], a = dim(s.o2, o2, O2_TOL), b = dim(s.p, p, P_TOL), d = [a, b].filter(x => x !== undefined);
    let st = 'none';
    if (!d.length) st = 'undefined'; else if (d.every(x => x === null)) st = 'unrecorded'; else if (d.every(x => x === true)) st = 'full';
    else if (d.some(x => x === true)) st = 'partial'; else st = 'miss';
    return { st, o2: a, p: b };
  }
  const OVC = { full: '#ff7a2f', partial: '#5b7cfa', miss: '#e5484d', unrecorded: 'none', undefined: 'none' };
  const tri = (x, u) => x === undefined ? 'not entered' : x === null ? 'recorded conditions unavailable' : x ? 'a recorded row lies within ' + u : 'no recorded row within ' + u;
  function renderMissionTabs() {
    const box = $('#mission-tabs'); box.innerHTML = '';
    MISSIONS.forEach(m => { const b = document.createElement('button'); b.type = 'button'; b.textContent = m.name; b.setAttribute('aria-pressed', m === mission); b.onclick = () => { mission = m; $('#ms-o2').value = m.o2 ?? ''; $('#ms-p').value = m.p ?? ''; msSel = null; firstDraw = true; renderMissionTabs(); renderConst(); $('#ms-insp').innerHTML = '<p class="mono" style="color:var(--muted)">Select a node to open the investigation.</p>'; }; box.appendChild(b); });
  }
  function renderConst() {
    const svg = $('#constellation'), o2 = $('#ms-o2').value === '' ? null : +$('#ms-o2').value, p = $('#ms-p').value === '' ? null : +$('#ms-p').value;
    $('#ms-src').textContent = mission.src; $('#ms-note').textContent = mission.note;
    const items = mission.links.map(a => byAcc(a)).filter(Boolean).map(i => ({ i, rel: mission.rel || (['solid', 'smoke'].includes(i.family) ? 'direct' : 'indirect') }));
    const cx = 350, cy = 280, anim = firstDraw && !reduceMotion; firstDraw = false;
    let h = `<defs><radialGradient id="cg" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#ffc48a"/><stop offset=".75" stop-color="#c2410c"/><stop offset="1" stop-color="#1d2129"/></radialGradient></defs>
      <circle class="orbit" cx="${cx}" cy="${cy}" r="150"/><circle class="orbit" cx="${cx}" cy="${cy}" r="235"/>`;
    const place = [];
    ['direct', 'indirect'].forEach((rel, ri) => { const g = items.filter(x => x.rel === rel), R = ri ? 235 : 150; g.forEach((x, k) => { const a = -Math.PI / 2 + (k / g.length) * 2 * Math.PI + ri * .35; place.push({ ...x, x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R }); }); });
    place.forEach((n, k) => { h += `<line class="edge" x1="${cx}" y1="${cy}" x2="${n.x.toFixed(1)}" y2="${n.y.toFixed(1)}"${anim ? ` style="opacity:0;animation:reveal .6s ${k * 70}ms both"` : ''}/>`; });
    h += `<circle cx="${cx}" cy="${cy}" r="40" fill="url(#cg)"/><text x="${cx}" y="${cy + 58}" text-anchor="middle" style="font-size:13px;fill:#fff">${esc(mission.name)}</text>`;
    place.forEach((n, k) => {
      const ov = overlap(n.i.accession, o2, p), r = 9 + Math.min(16, Math.sqrt(STATS[n.i.accession].n) * .8), fill = OVC[ov.st];
      h += `<g class="node${anim ? ' reveal' : ''}" tabindex="0" role="button" data-acc="${esc(n.i.accession)}" aria-label="${esc(n.i.accession + ' ' + n.i.name + ', ' + n.rel + ' relevance')}"${anim ? ` style="animation-delay:${k * 70 + 200}ms"` : ''}>
        <circle class="core" pointer-events="all" cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" fill-opacity="${fill === 'none' ? 0 : .85}" stroke="${fill === 'none' ? '#9a9ca5' : '#f3efe8'}" stroke-width="${msSel === n.i.accession ? 3 : 1.2}" ${fill === 'none' ? 'stroke-dasharray="3 3"' : ''}/>
        <text x="${n.x.toFixed(1)}" y="${(n.y + r + 13).toFixed(1)}" text-anchor="middle">${esc(n.i.accession)}</text></g>`;
    });
    svg.innerHTML = h;
    $$('.node', svg).forEach(g => { const open = () => { msSel = g.dataset.acc; const i = byAcc(msSel), it = place.find(x => x.i === i), ov = overlap(msSel, o2, p); renderConst(); const box = $('#ms-insp');
      const why = i.family === 'solid' ? 'Tests of solid materials of the kind found in crew cabins.' : i.family === 'smoke' ? 'Smoke / aerosol detection experiment — relevant to cabin fire detection.' : i.family === 'droplet' ? 'Fundamental droplet-flame extinction on liquid fuels (' + esc((i.materials || []).join(', ')) + ') — not cabin materials.' : 'Fundamental gas-flame / cool-flame study — background physics, not cabin materials.';
      box.innerHTML = `<div class="mono" style="color:var(--muted);font-size:11px">RELEVANCE TO ${esc(mission.name.toUpperCase())}</div><div>${EV('INFERRED', 'FIRENEX judgement from family and recorded conditions')}<span class="ev ev-${it.rel === 'direct' ? 'REPORTED' : 'UNKNOWN'}">${it.rel.toUpperCase()}</span></div><p style="margin:6px 0">${why}</p>
        <div class="fx-note" style="margin:6px 0 12px"><strong>Condition overlap</strong> (±${O2_TOL} O₂ pts, ±${P_TOL} psia): O₂ — ${tri(ov.o2, '±' + O2_TOL + ' pts')}; pressure — ${tri(ov.p, '±' + P_TOL + ' psia')}.</div>` + inspector(i); wireInsp(box); box.querySelector('[data-act]') && 0; };
      g.addEventListener('click', open); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }); });
    if (msSel) { const g = $(`.node[data-acc="${msSel}"]`, svg); if (g) g.setAttribute('aria-current', 'true'); }
  }

  /* ---------------- Research Library ---------------- */
  let libSel = null;
  function renderLib() {
    const q = $('#lib-q').value.trim().toLowerCase(), fam = $('#lib-fam').value, lo = $('#lib-o2lo').value, hi = $('#lib-o2hi').value, unrec = $('#lib-unrec').checked;
    const list = INV.filter(i => {
      const s = STATS[i.accession];
      if (fam && i.family_label !== fam) return false;
      if (q && !(i.name + ' ' + i.accession + ' ' + (i.materials || []).join(' ') + ' ' + i.family_label).toLowerCase().includes(q)) return false;
      if (lo !== '' || hi !== '') { if (!s.o2r) return unrec; if (lo !== '' && s.o2r[1] < +lo) return false; if (hi !== '' && s.o2r[0] > +hi) return false; }
      return true;
    });
    $('#lib-count').textContent = `${list.length} of ${INV.length} investigations`;
    $('#lib-list').innerHTML = list.length ? list.map(i => { const s = STATS[i.accession]; return `<button type="button" class="fx-card${libSel === i.accession ? ' sel' : ''}" data-acc="${esc(i.accession)}"><div class="acc">${esc(i.accession)}</div><h3>${esc(i.name)}</h3>
      <div>${evOf(i)}</div><div class="fx-meta"><span>${nf(s.n)} rows</span><span>O₂ ${fmtR(s.o2r, '%') || 'n/r'}</span><span>P ${fmtR(s.pr, ' psia') || 'n/r'}</span></div></button>`; }).join('') : '<p class="fx-note fx-warn">No investigation matches these filters.</p>';
    $$('#lib-list .fx-card').forEach(b => b.onclick = () => { libSel = b.dataset.acc; renderLib(); const box = $('#lib-insp'); box.innerHTML = inspector(byAcc(libSel)); wireInsp(box); });
  }

  /* ---------------- Compare ---------------- */
  let cmp = [];
  function addCompare(a) { if (!cmp.includes(a) && cmp.length < 3) cmp.push(a); renderCmp(); }
  function renderCmp() {
    $('#cmp-pick').innerHTML = INV.map(i => `<label style="display:flex;gap:6px;align-items:center;font-size:13px"><input type="checkbox" value="${esc(i.accession)}" ${cmp.includes(i.accession) ? 'checked' : ''} ${!cmp.includes(i.accession) && cmp.length >= 3 ? 'disabled' : ''}> <span class="mono">${esc(i.accession)}</span></label>`).join('');
    $$('#cmp-pick input').forEach(c => c.onchange = () => { cmp = c.checked ? [...cmp, c.value] : cmp.filter(x => x !== c.value); renderCmp(); });
    const out = $('#cmp-out');
    if (cmp.length < 2) { out.innerHTML = '<p class="fx-note">Select at least two investigations.</p>'; return; }
    const sel = cmp.map(a => byAcc(a)), S = sel.map(i => STATS[i.accession]);
    const row = (label, f) => `<tr><th scope="row">${label}</th>${sel.map((i, k) => { const v = f(i, S[k]); return `<td${v === null ? ' class="na"' : ''}>${v === null ? 'not recorded' : v}</td>`; }).join('')}</tr>`;
    const inter = (key, u, name) => { const miss = sel.filter((i, k) => !S[k][key]).map(i => i.accession); if (miss.length) return `<strong>${name}:</strong> cannot be compared — not recorded for ${esc(miss.join(', '))}.`; const lo = Math.max(...S.map(s => s[key][0])), hi = Math.min(...S.map(s => s[key][1])); return lo <= hi ? `<strong>${name}:</strong> recorded ranges overlap at ${+lo.toFixed(2)}–${+hi.toFixed(2)}${u} (overlap of ranges, not proof that matched tests exist).` : `<strong>${name}:</strong> recorded ranges do <em>not</em> overlap.`; };
    const fams = new Set(sel.map(i => i.family_label));
    out.innerHTML = `<div class="tbl-wrap"><table class="fx-table"><thead><tr><th></th>${sel.map(i => `<th scope="col">${esc(i.accession)}<br><span style="text-transform:none;letter-spacing:0;font-family:var(--font-body);color:var(--text)">${esc(i.name)}</span></th>`).join('')}</tr></thead><tbody>
      ${row('Family', i => esc(i.family_label))}${row('Test rows', (i, s) => nf(s.n))}${row('Material / fuel', i => (i.materials || []).length ? esc(i.materials.slice(0, 6).join(', ')) + (i.materials.length > 6 ? ` +${i.materials.length - 6}` : '') : null)}
      ${row('O₂ (%)', (i, s) => fmtR(s.o2r, ''))}${row('Pressure (psia)', (i, s) => fmtR(s.pr, ''))}${row('Airflow (cm/s)', (i, s) => fmtR(s.flr, ''))}
      ${row('Outcomes recorded', (i, s) => Object.keys(s.out).length ? Object.entries(s.out).map(([k, v]) => `${esc(k)} ×${v}`).join(', ') : null)}
      ${row('Gravity / environment', () => null)}${row('Evidence class', i => evOf(i))}${row('DOI', i => doiLink(i.doi))}</tbody></table></div>
      <div class="fx-note"><div>${inter('o2r', ' %', 'Oxygen')}</div><div>${inter('pr', ' psia', 'Pressure')}</div><div>${inter('flr', ' cm/s', 'Airflow')}</div></div>
      ${fams.size > 1 ? '<div class="fx-note fx-warn"><strong>Not directly comparable:</strong> these investigations study different fuel phases / hardware (' + esc([...fams].join(' · ')) + '). Outcome labels and test procedures differ, so compare recorded <em>conditions</em>, not results.</div>' : '<div class="fx-note">Same family does not guarantee identical procedures — check the DOI before comparing outcomes.</div>'}
      <div class="fx-note fx-warn">Gravity is not a recorded field in the PSI tables used here; no partial-gravity comparison is possible.</div>`;
  }

  /* ---------------- Gap Radar + Evidence cards ---------------- */
  const BANDS = { o2: [['<17', -1e9, 17], ['17–21', 17, 21], ['21–25', 21, 25], ['25–34', 25, 34], ['34–50', 34, 50], ['>50', 50, 1e9]], p: [['<8', -1e9, 8], ['8–10', 8, 10], ['10–14', 10, 14], ['14–15.5', 14, 15.5], ['15.5–30', 15.5, 30], ['>30', 30, 1e9]] };
  const MARK = { o2: { 1: 'ISS 21%', 3: null, 4: 'Moon 34%' }, p: { 1: 'Moon 8.2', 3: 'ISS 14.7' } };
  const CLS = [['gas', 'Gas flames'], ['solid', 'Solid materials'], ['droplet', 'Droplets'], ['aerosol', 'Aerosol']];
  function renderGap() {
    const ax = $('#gap-axis').value, B = BANDS[ax], key = ax;
    const val = r => Array.isArray(r[key]) ? (r[key][0] + r[key][1]) / 2 : null;
    const cell = {}; CLS.forEach(([c]) => { cell[c] = B.map(() => ({})); cell[c].nr = 0; cell[c].tot = 0; });
    ROWS.forEach(r => { if (!cell[r.cls]) return; const c = cell[r.cls]; c.tot++; const v = val(r); if (v == null) { c.nr++; return; } const bi = B.findIndex(b => v >= b[1] && v < b[2]); c[bi][r.acc] = (c[bi][r.acc] || 0) + 1; });
    const unit = ax === 'o2' ? '% O₂' : 'psia';
    const mk = { o2: { 2: 'ISS 21%', 4: 'Moon 34%' }, p: { 1: 'Moon 8.2', 3: 'ISS 14.7' } }[ax];
    $('#gap-table').innerHTML = `<thead><tr><th>Fuel phase</th>${B.map((b, i) => `<th class="${mk[i] ? 'mk' : ''}">${b[0]} ${unit.slice(0, 1) === '%' ? '' : ''}${mk[i] ? '<br>◆ ' + mk[i] : ''}</th>`).join('')}<th>Not recorded</th><th>Total</th></tr></thead><tbody>` +
      CLS.map(([c, lab]) => `<tr><th scope="row">${lab}</th>${B.map((b, i) => { const n = Object.values(cell[c][i]).reduce((a, x) => a + x, 0); return `<td class="cell ${n ? '' : 'zero'}" tabindex="0" role="button" data-c="${c}" data-i="${i}" aria-label="${lab}, ${b[0]} ${unit}: ${n} rows">${n || 'none'}</td>`; }).join('')}<td class="cell nr">${cell[c].nr}</td><td class="cell">${cell[c].tot}</td></tr>`).join('') + '</tbody>';
    const show = (c, i) => { const m = cell[c][i], lab = CLS.find(x => x[0] === c)[1], tot = Object.values(m).reduce((a, x) => a + x, 0);
      $('#gap-detail').innerHTML = tot ? `<strong>${lab}, ${B[i][0]} ${unit}:</strong> ${tot} rows — ` + Object.entries(m).map(([a, n]) => `${esc(a)} ×${n}`).join(', ') + '.' : `<strong>${lab}, ${B[i][0]} ${unit}:</strong> no test rows in this data. ${EV('UNKNOWN', 'No evidence in the available data')} This is a gap in the record, not a safety finding.`; };
    $$('#gap-table td.cell[data-c]').forEach(td => { const f = () => show(td.dataset.c, +td.dataset.i); td.onclick = f; td.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f(); } }; });
  }
  function renderEvCards() {
    const solids = ROWS.filter(r => r.cls === 'solid' && Array.isArray(r.o2)), maxO2 = Math.max(...solids.map(r => r[ 'o2' ][1])), ge34 = solids.filter(r => r.o2[1] >= 34).length;
    const withOut = ROWS.filter(r => r.out != null).length, pNR = ROWS.filter(r => !Array.isArray(r.p)).length;
    const m = k => DET.by_material.find(x => x.material === k), sm = DET.psi115_smoke['8cm'], v = MODEL.validation, env = MODEL.envelope;
    const card = (t, cls, d) => `<article class="ev-card"><div>${cls.map(c => EV(c)).join('')}</div><h4>${t}</h4><dl>${Object.entries(d).map(([k, x]) => `<dt>${k}</dt><dd>${x}</dd>`).join('')}</dl></article>`;
    $('#ev-cards').innerHTML =
      card('Solid-material tests stop at ' + maxO2 + '% O₂', ['REPORTED', 'UNKNOWN'], { Finding: `Highest O₂ recorded for solid-material test rows is ${maxO2}% (${solids.length} solid rows with O₂ recorded; ${ge34} at or above 34%).`, Conditions: 'PSI-25, PSI-26 and Spacecraft Fire Experiments (solid fuels).', Source: doiLink('10.60555/4qc4-de67') + ' · ' + doiLink('10.60555/58h4-dy80'), Limits: 'Most solid tables record test conditions, not burn outcomes.', 'Mission relevance': 'INFERRED: the NASA-recommended lunar atmosphere (34% O₂) lies above this range.', Uncertain: 'Flammability of these materials at 34% O₂ is not established by these sources.' }) +
      card('ISS smoke detector barely responded to Kapton and Teflon smoke', ['MEASURED'], { Finding: `Median obscuration drop: Kapton ${m('Kapton').obsc_drop_med_V} V (${m('Kapton').tests} tests), Teflon ${m('Teflon').obsc_drop_med_V} V (${m('Teflon').tests}); Silicone ${m('Silicone').obsc_drop_med_V} V (${m('Silicone').tests}).`, Conditions: 'SAME-R (PSI-101) ISS detector telemetry, smoke window 200–1000 s; ' + DET.headlines.samer_tests_no_response + ' of ' + DET.headlines.samer_tests_analysed + ' analysed tests showed no response.', Source: doiLink('10.60555/2np7-jv14'), Limits: 'Medians only; per-test spread exists (Kapton max ' + m('Kapton').obsc_drop_max_V + ' V). Not a reliability rating.', Uncertain: 'Other materials, smoke sizes and detector designs are untested here.' }) +
      card('Modelled smoke accumulates more in microgravity', ['MODELLED'], { Finding: `Peak smoke concentration ${sm.Microgravity.max.toFixed(2)} (microgravity) vs ${sm.Earth.max.toFixed(2)} (Earth), 8 cm case.`, Conditions: 'PSI-115 smoke-modelling grids (summarised).', Source: doiLink('10.60555/q0v5-1v28'), Limits: 'Modelling output — not flight measurement.', Uncertain: 'Real-cabin behaviour is not established by this model alone.' }) +
      card('Safe Predictor: a modest model that abstains', ['MODELLED'], { Finding: `Holdout accuracy ${v.holdout_accuracy} vs ${v.majority_baseline_accuracy} majority baseline (n=${v.n_holdout}) — a margin of about 4 tests.`, Conditions: `Only ${env.fuels.join(' / ')}, ${env.o2[0]}–${env.o2[1]}% O₂, ${env.pressure_psi[0].toFixed(1)}–${env.pressure_psi[1].toFixed(1)} psia.`, Source: doiLink(MODEL.doi), Limits: 'Refuses outside the tested envelope. Not validated for operational spacecraft safety.', Uncertain: 'Generalisation beyond droplet tests is unknown.' }) +
      card('Most records lack outcomes and pressure', ['UNKNOWN'], { Finding: `${nf(withOut)} of ${nf(ROWS.length)} rows (${(withOut / ROWS.length * 100).toFixed(1)}%) record an outcome; ${nf(pNR)} rows have no pressure recorded.`, Source: 'PSI backbone (computed by FIRENEX from the data)', Limits: 'Blank means not recorded — never zero.', Uncertain: 'Conclusions about conditions without outcomes cannot be drawn.' });
    const rows = [
      ['MEASURED', 'SAME-R detector telemetry — ' + nf(DET.headlines.samer_telemetry_rows) + ' readings, ' + DET.headlines.samer_tests_analysed + ' tests analysed'],
      ['MODELLED', 'PSI-115 smoke grids (9,446,715 values); PSI-117 cool-flame proceedings data; Flame Lab (simplified simulation, not CFD); Safe Predictor'],
      ['REPORTED', nf(ROWS.length) + ' PSI experimental-table rows (' + INV.length + ' investigations); PSI-108 flame-spread report values'],
      ['INFERRED', 'Mission relevance links and condition-overlap checks in Mission Discovery'],
      ['UNKNOWN', 'Partial-gravity combustion (no data); DAFT / DAFT-2 (not in this dataset); solids at ≥34% O₂ (' + ge34 + ' rows); rover-cabin tests (none)']];
    $('#gap-classes').innerHTML = '<thead><tr><th>Class</th><th>What this project holds</th></tr></thead><tbody>' + rows.map(r => `<tr><td>${EV(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('') + '</tbody>';
  }

  /* ---------------- Ask Flame (retrieval + abstention) ---------------- */
  const STOP = new Set('the a an of in on at to for is are was were be do does did what which how why can could should would and or with from by about it its this that there any percent percentage'.split(' '));
  const tok = s => (String(s).toLowerCase().match(/[a-z0-9₂]+/g) || []).filter(w => w.length > 1 && !STOP.has(w));
  const UNKNOWNS = [
    [/partial[- ]?gravity|lunar gravity|mars gravity|0\.16 ?g|0\.38 ?g|moon gravity/i, 'No partial-gravity (lunar or Mars g) combustion data exists in the PSI data used here, and the tables have no gravity field.'],
    [/daft/i, 'DAFT / DAFT-2 are not among the 19 investigations in this project’s data.'],
    [/certif|approved|operational(ly)? safe|is it safe to/i, 'FIRENEX is not a certified spacecraft safety system and gives no safety approvals. It summarises recorded test evidence only.'],
    [/\bcfd\b/i, 'The Flame Lab is a simplified grid simulation for teaching — it is not CFD and not a recording.']
  ];
  function buildDocs() {
    const docs = [];
    INV.forEach(i => { const s = STATS[i.accession]; docs.push({ t: `${i.accession} — ${i.name}`, a: `${i.name} is a “${i.family_label}” investigation with ${nf(s.n)} recorded test rows in the PSI data.`, src: doiLink(i.doi), c: [`O₂ ${fmtR(s.o2r, ' %') || 'not recorded'}`, `pressure ${fmtR(s.pr, ' psia') || 'not recorded'}`, 'materials: ' + ((i.materials || []).slice(0, 5).join(', ') || 'not recorded')].join('; '), cls: ['REPORTED'], l: 'Objective and results are not stored here; rows are conditions/outcomes as recorded, not conclusions. See the DOI.', k: tok([i.accession, i.name, i.family_label, ...(i.materials || [])].join(' ')) }); });
    DET.by_material.forEach(m => docs.push({ t: `ISS smoke detector response — ${m.material}`, a: `In SAME-R tests the ISS smoke detector’s median obscuration drop for ${m.material} smoke was ${m.obsc_drop_med_V} V over ${m.tests} tests (range ${m.obsc_drop_min_V}–${m.obsc_drop_max_V} V).`, src: doiLink('10.60555/2np7-jv14'), c: 'SAME-R (PSI-101) ISS detector telemetry; smoke window 200–1000 s.', cls: ['MEASURED'], l: 'Medians describe typical response only; they do not establish detector reliability.', k: tok(`smoke detector detection obscuration response SAME-R ISS ${m.material}`) }));
    const sm = DET.psi115_smoke['8cm']; docs.push({ t: 'Smoke accumulation: microgravity vs Earth (PSI-115)', a: `Modelled peak smoke concentration was ${sm.Microgravity.max.toFixed(2)} in microgravity vs ${sm.Earth.max.toFixed(2)} on Earth (8 cm case).`, src: doiLink('10.60555/q0v5-1v28'), c: 'PSI-115 smoke-modelling grids, 8 cm case.', cls: ['MODELLED'], l: 'Modelling output, not flight measurement.', k: tok('smoke accumulation microgravity earth model grid concentration PSI-115 buoyancy') });
    const v = MODEL.validation; docs.push({ t: 'Safe Predictor validation', a: `The Safe Predictor decision tree reached holdout accuracy ${v.holdout_accuracy} vs a ${v.majority_baseline_accuracy} majority baseline on n=${v.n_holdout} tests, and abstains outside its envelope.`, src: doiLink(MODEL.doi), c: `${MODEL.envelope.fuels.join('/')}, ${MODEL.envelope.o2[0]}–${MODEL.envelope.o2[1]}% O₂.`, cls: ['MODELLED'], l: 'Modest margin (~4 tests in 55); not validated for operational spacecraft safety.', k: tok('safe predictor model validation accuracy decision tree extinction droplet FLEX baseline holdout predict') });
    CLAIMS.forEach(c => docs.push({ t: 'Documented claim', a: c.claim, src: esc(c.source), c: 'As stated in the cited source.', cls: [/model|PSI-115|PSI-117/i.test(c.claim) ? 'MODELLED' : 'REPORTED'], l: `Status in docs/claims.md: ${c.status}.`, k: tok(c.claim + ' ' + c.source) }));
    return docs;
  }
  let DOCS = [];
  function ask(q) {
    const out = $('#ask-out'); q = q.trim(); if (!q) return;
    const unk = UNKNOWNS.find(u => u[0].test(q));
    if (unk) { out.innerHTML = `<div class="ask-ans abstain">${EV('UNKNOWN')}<h4>The available research sources do not establish this.</h4><p>${esc(unk[1])}</p></div>`; return; }
    const qt = [...new Set(tok(q))]; if (!qt.length) { out.innerHTML = '<div class="ask-ans abstain"><h4>The available research sources do not establish this.</h4><p>Try naming a material, investigation or measurement.</p></div>'; return; }
    const scored = DOCS.map(d => { const ks = new Set(d.k); let m = 0; qt.forEach(w => { if (ks.has(w)) m += 1; else if (w.length > 3 && d.k.some(x => x.startsWith(w) || w.startsWith(x) && x.length > 3)) m += .6; }); return { d, m }; }).filter(x => x.m >= Math.max(1, qt.length * .5)).sort((a, b) => b.m - a.m).slice(0, 3);
    if (!scored.length) { out.innerHTML = `<div class="ask-ans abstain">${EV('UNKNOWN')}<h4>The available research sources do not establish this.</h4><p>Searched ${INV.length} investigations, ${CLAIMS.length} documented claims and the detector, smoke-model and predictor summaries — no match for “${esc(q)}”.</p></div>`; return; }
    out.innerHTML = scored.map(({ d }) => `<div class="ask-ans"><div>${d.cls.map(c => EV(c)).join('')}</div><h4>${esc(d.t)}</h4>
      <p><strong>Answer:</strong> ${esc(d.a)}</p><p><strong>Conditions:</strong> ${esc(d.c)}</p><p><strong>Source:</strong> ${/^<a/.test(d.src) ? d.src : d.src.replace(/(https?:\/\/[^\s;)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')}</p><p><strong>Limitations:</strong> ${esc(d.l)}</p></div>`).join('') +
      '<div class="fx-btns"><button class="fx-btn" id="ask-cabin">Check exact test rows in Cabin Check</button></div>';
    const b = $('#ask-cabin'); if (b) b.onclick = () => go('cabin');
  }
  function initAsk() {
    DOCS = buildDocs();
    ['Kapton smoke detector response', 'Moon atmosphere 34% oxygen', 'Droplet extinction methanol heptane', 'Is the Safe Predictor validated?', 'Partial gravity lunar Mars'].forEach(t => { const b = document.createElement('button'); b.type = 'button'; b.className = 'fx-btn'; b.textContent = t; b.onclick = () => { $('#ask-q').value = t; ask(t); }; $('#ask-chips').appendChild(b); });
    $('#ask-form').onsubmit = e => { e.preventDefault(); ask($('#ask-q').value); };
  }
  function parseClaims(md) {
    return md.split('\n').filter(l => l.startsWith('|')).map(l => l.split('|').slice(1, -1).map(x => x.trim().replace(/\*\*/g, ''))).filter(c => c.length >= 3 && !/^-+$/.test(c[0]) && c[0] !== 'Claim' && !/^dropped/i.test(c[2])).map(c => ({ claim: c[0], source: c[1], status: c[2].split(/[—–-]/)[0].trim() }));
  }

  /* ---------------- boot ---------------- */
  async function boot() {
    hero();
    try {
      const j = u => fetch(u).then(r => { if (!r.ok) throw new Error(u); return r.json(); });
      const [inv, bb, det, mod, md] = await Promise.all([j('data/investigations.json'), j('data/backbone.json'), j('data/detection.json'), j('data/model.json'), fetch('docs/claims.md').then(r => r.ok ? r.text() : '').catch(() => '')]);
      INV = inv; ROWS = bb.rows; DET = det; MODEL = mod; CLAIMS = parseClaims(md); stats();
      $$('[data-fx=rows]').forEach(e => e.textContent = nf(ROWS.length)); $$('[data-fx=invs]').forEach(e => e.textContent = INV.length);
      // missions
      $('#ms-o2').value = mission.o2 ?? ''; $('#ms-p').value = mission.p ?? '';
      $('#ms-o2').oninput = $('#ms-p').oninput = renderConst; renderMissionTabs(); renderConst();
      // library
      const fams = [...new Set(INV.map(i => i.family_label))]; $('#lib-fam').innerHTML = '<option value="">All families</option>' + fams.map(f => `<option>${esc(f)}</option>`).join('');
      ['#lib-q', '#lib-fam', '#lib-o2lo', '#lib-o2hi', '#lib-unrec'].forEach(s => { $(s).oninput = renderLib; $(s).onchange = renderLib; }); renderLib();
      cmp = ['PSI-69', 'PSI-159']; renderCmp();
      $('#gap-axis').onchange = renderGap; renderGap(); renderEvCards(); initAsk();
    } catch (e) {
      console.error('FIRENEX data load failed', e);
      ['#sec-missions', '#sec-library', '#sec-compare', '#sec-gaps', '#sec-ask'].forEach(s => { const el = $(s); if (el) el.insertAdjacentHTML('beforeend', '<div class="fx-note fx-warn">Data could not be loaded. Serve the site over HTTP (python3 -m http.server) — browsers block data loading on file://.</div>'); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
