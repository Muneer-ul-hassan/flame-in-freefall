# BUILD REPORT — Flame in Freefall web app
**Built:** Sat Nov 14, 2026 (solo build; teammates unavailable) · **Status: complete, verified locally. NOT pushed, NOT deployed** (deployment is the parent agent's step after verification).

## Location & stack
- App: `~/workspace/nasa-challenge/flame-app/` — `index.html`, `style.css`, `app.js`, `data/*.json`
- Plain HTML/CSS/JavaScript + **GSAP** (CDN, with graceful fallback if the CDN is unreachable — content and counters still render). Dark theme, green/yellow/red risk colours. No framework, no server-side code.
- Build scripts kept alongside: `prep_data.py` (source CSVs/JSON → app JSONs), `train_model.py` (scikit-learn tree → `data/model.json`). Python venv used: `~/workspace/flame-venv` (scikit-learn 1.9.1, pandas 3.1.1).
- **GitHub-Pages-ready:** all asset/data paths are relative (`data/…`, `style.css`, `app.js`); no absolute paths; verified working under a repo subpath (`/flame-in-freefall/`) as well as at root. Note: browsers block `fetch()` on `file://`, so serve over HTTP (`python3 -m http.server`) or GitHub Pages — the app prints a clear notice if data fails to load.

## What was built, per section
1. **Home** — problem statement; Prevention/Detection/Suppression pillar cards; three animated counters (22.2% O₂ solids ceiling · 0.001 V Kapton/Teflon detector response · 14.17 vs 7.50 microgravity smoke peak); story cards for Apollo 1 (1967), Apollo 13 (1970), Mir (1997) in the same card design system.
2. **Prevention — Cabin Check** — material (grouped by solid/droplet/gas/aerosol, built from the backbone itself) + O₂ + optional pressure + optional airflow; presets ISS (21%/14.7 psia), Moon (34%/8.2), Spacesuit (100%/4.3). Verdict from matched real rows (O₂ ±2 pts; pressure ±3 psia / flow ±5 cm/s when both sides record them); shows outcome counts when the PSI table records outcomes, a “coverage only — no outcome column” verdict when it doesn't, the matched source rows (test ref + PSI accession), and a hard **NO TEST DATA** state (exact-conditions and within-±5 variants). CFI-G outcome codes (SE/FT) are shown as recorded, never reinterpreted.
3. **Prevention — Inventory Screener** — paste a material list → traffic-light table (TESTED / NEARBY ONLY / GAP / NOT IN PSI DATA / NO O₂ DATA) × 3 atmospheres, each cell carrying the nearest real test O₂ and the material's tested range. It is a coverage verdict, and says so.
4. **Detection Panel** — SAME-R per-material obscuration chart + table (Silicone 0.300 V, Pyrell 0.069, Lampwick 0.020, Kapton 0.001, Teflon 0.001 median drop), full 45-test table with per-test obscuration/scatter/ion and response chip; three-channel card (Lampwick 80/82 scatter rail −6.25 V labelled as saturation; Kapton test 62 scatter −1.67 V / ion 0.23 V); NIST finding card (hedged as “as reported in the team's challenge research”; the detector numbers beside it are our own count); PSI-115 Earth-vs-microgravity chart + table (8 cm and 10 cm: peak, mean, % cells with smoke), labelled modelling data; coverage caveat (45 of 109 tests have raw files) printed on the page.
5. **Suppression View** — see the model section below; plus extinction-share-by-O₂ chart (10 fuel×bin bars, each with n), and evidence cards: Researcher's Guide suppressant-jet finding (source named), BASS solids card (251 rows, materials, O₂ 13.6–22.2%, **no outcome column — stated on the card**), PSI-108 SSCE flame-spread card (0.092 cm/s @35% O₂/1 atm → 0.547 cm/s @50% O₂/2 atm, from the extracted report text).
6. **Safe Predictor** — real trained model, below.
7. **Investigation Cards** — all 19 investigations as cards (name, accession, family, rows, tested O₂ range, pressure range, top materials, outcome summary or “No outcome column in PSI table”, DOI link), filterable by family (solids/droplets/gas flames/smoke & detection) and searchable by name/accession/material; GSAP entrance + CSS hover lift, same card system as Home stories and Suppression evidence.
8. **References & Method** — per-investigation dataset table with DOIs (from the backbone), PSI-115 (DOI 10.60555/q0v5-1v28) and PSI-117 (DOI 10.60555/gz0q-b577) with the model/proceedings label, PSI-108 note, PSI-60/62 zero-data note, backbone provenance + self-clean note, all 10 official resources with links (Researcher's Guide uses the recovered live URL, noted), method/honesty rules, detection caveats, and the AI-tools attestation line.

## Models
### Safe Predictor (trained model — real)
- **Data:** PSI-69 FLEX rows in the backbone with fuel ∈ {Methanol, Heptane} and O₂ + pressure + outcome present → **273 rows** (Extinction 185, Disruption 61, Completion 27). Target: Extinction vs No-extinction (Disruption+Completion).
- **Features:** fuel, O₂ %, pressure (psia). **Model:** scikit-learn `DecisionTreeClassifier`, max_depth 4, min_samples_leaf 10; final tree retrained on all 273 rows and exported to JSON; inference re-implemented as a tree-walk in JS, showing the decision path and leaf counts.
- **Envelope gate:** fuel must be Methanol/Heptane, O₂ within **12–34%**, pressure within **10.2–44.9 psia** (the training rows' own ranges). Outside → the app refuses with a “NO PREDICTION — outside tested data” panel.
- **Honest validation (stratified 80/20 holdout, seed 42, n_holdout = 55):** accuracy **0.745** vs majority-class baseline **0.673**; confusion TP 29 / FP 6 / TN 12 / FN 8; gate abstained on **0** holdout cases (expected — holdout is drawn from inside the same envelope; this is stated in the app, not hidden). The app calls the model “modest — beats baseline by ~7 points”.
- **PSI-117 cross-check: NOT POSSIBLE** — the tidy PSI-117 table has fuel + pressure + extinction *diameter* but no O₂ column and no extinction yes/no outcome. Skipped and documented in the app and here, per instructions.

### Suppression model (trained model — NOT possible; honest alternative built)
- **Why no trained diluent model:** the backbone schema has **no diluent type or fraction field for any of the 2,012 rows** (verified by field inspection + keyword scan of notes/materials/flags). BASS/BASS-II (251 rows) have an **empty outcome column** (“No outcome column in PSI table”). Gas-flame tables do carry diluent-blended fuel labels (e.g. “Ethylene (50% bottle) [with N2]”) but no extinction outcome either. Any diluent model would be invented — so none was built.
- **Built instead — evidence-matched recommender:** same fuel, FLEX rows within ±3 O₂ points and ±5 psia → reports “based on N real test rows: X of N flames went out”, lists the matched rows, and shows a NO MATCHED TEST ROWS state outside the evidence. Default case verified: Methanol 21%/14.7 psia → 78 rows, 63 extinguished (81%).

## Number audit (per Muneer's hard rule: no assumptions, no demo data)
Every displayed number was traced to a file; the app computes counts/ranges from the shipped JSONs at runtime wherever feasible. Checked individually:
- **22.2%** solids O₂ ceiling — *computed* in `prep_data.py` from backbone solid rows (140 rows with O₂); not typed in. Moon 34%/8.2 psia and suit 100%/4.3 psia are **scenario definitions** from the challenge context, labelled as presets, not measurements.
- **0.001 / 0.30 V, 21 of 45, 68,699 readings, scatter −6.25 V, Kapton-62 −1.67 V / 0.23 V, Lampwick 80/82 0.06–0.08 V** — from `samer_detection_by_material.csv`, `samer_detection_by_test.csv`, `DETECTION-PANEL.md` (the team's own count from the 44 raw HKP files). −6.25 V is labelled a saturation rail on the page.
- **14.17 / 7.50, means, % cells** — from `psi115_summary.csv` (computed from the 44 downloaded grids, 9,446,715 values).
- **0.092 → 0.547 cm/s** — from the PSI-108 SSCE report text extracted from the PSI study files (cited as such).
- **Suppressant-jet finding** — qualitative finding from the Researcher's Guide PDF (official resource), quoted as a finding, not a measurement.
- **All card values** (row counts, O₂/pressure ranges, outcome counts, DOIs) — aggregated by script from `cleaned.json`; where a table records nothing, the card says “not recorded” / “No outcome column” instead of a value.
- **Model numbers** — computed by `train_model.py` at build time (above).
- **Replaced with no-data states (no assumed values anywhere):** Cabin Check beyond-coverage queries → NO TEST DATA; solids burn verdicts → “coverage only” (no outcome column exists); Suppression diluent recommendation → evidence lookup + explicit statement that no diluent data exists; Predictor outside envelope → abstention; Screener unknown material → NOT IN PSI DATA; Kapton/Teflon in the Screener → NO O₂ DATA (their PSI-101 rows record flow, not O₂). Matching tolerances (±2/±5 O₂ etc.) are method parameters, printed openly in each tool — not data.

## Verification performed
- Served via `python3 -m http.server`; all 5 data JSONs return 200.
- Headless Chrome (Chrome-for-Testing) rendered the app; **built-in self-test (`?selftest=1`) — 10/10 PASS**: backbone 2,012 rows; 19 cards; Cabin Check PMMA@21% → 43 matched rows, PMMA@34% → 0 matched (gap state); Predictor answers inside envelope, **abstains at O₂ 60%** and for unknown fuel; Screener PMMA@Moon = GAP, PMMA@ISS = TESTED; Suppression match Methanol@21% → 78 rows. No JS console errors.
- **Subpath test:** same 10/10 PASS served under `/flame-in-freefall/` (GitHub Pages condition).
- **Screenshots inspected:** Home (counters land on 22.2 / 0.001 / 14.17; pillar + story cards render), Detection Panel (charts + tables match the CSVs), Investigation Cards (19 cards, correct values, filters/search wired). Default outputs of Cabin Check, Predictor and Suppression verified in the rendered DOM.

## Known limitations / could not do
- Headless Chrome here cannot reach the live internet, so the **GSAP CDN itself could not be fetched in the test environment** — animations were verified by code path (guarded `window.gsap` checks; counters fall back to final values, verified in screenshots where numbers show final values). On GitHub Pages / any online browser GSAP loads normally. If zero-CDN operation is ever required, vendor `gsap.min.js` into the folder and change one `<script>` tag.
- PSI-117 cross-validation of the predictor: impossible (feature/target mismatch) — documented above.
- A trained Suppression/diluent model: impossible on this data — documented above; evidence lookup shipped instead.
- Nothing was pushed to GitHub and nothing deployed — per instructions, deployment is the parent agent's verified next step.

## Design upgrade v2 — NASA mission-control design system (Sat Nov 14, 2026)
Cosmetics only. **No data, number, claim text, JS logic, element ID or data JSON was changed** — the single allowed text change is the hero headline/subline plus the specified additions below. Not pushed, not deployed (deployment remains the parent agent's step).

### index.html
- Added Google Fonts (Space Grotesk / Inter / JetBrains Mono) with preconnect; system fallbacks if the CDN fails.
- Hero headline → **"Understanding Fire Safety Beyond Earth."** and subline → *"From the International Space Station to deep-space missions, fire safety in space requires evidence, not assumptions."* (approved design direction; replaces the previous hero h1/lede).
- Added two hero CTAs wired through the existing `data-goto` routing: **Start Cabin Check** (→ Cabin Check) and **Open Safe Predictor** (→ Safe Predictor).
- Added a **Research Dataset Stats** band under the headline stat cards: **2,012** PSI test records · **68,699** ISS detector readings (SAME-R) · **9,446,715** smoke-modelling values (PSI-115) — dataset-inventory figures already used elsewhere in the app, labels kept precise.
- Added a footer citation strip (visible under every section): *"Data: NASA Physical Sciences Informatics (psi.nasa.gov) — 19 combustion investigations · SAME-R detector recordings (PSI-101) · PSI-115 (DOI 10.60555/q0v5-1v28) · PSI-117 (DOI 10.60555/gz0q-b577). Every number on this page traces to these sources — see References."* ("References" routes to the References section via the existing mechanism.)

### style.css (full restyle)
- Palette: background **#050B14** with a faint 44px grid-line texture (#5B7A99 at ~5% opacity); panels **#0A1626**; cards **#0E2233** with a `rgba(125,211,252,.08)` gradient overlay; sidebar/inputs **#0B1220**; secondary **#12233A**; borders 1px white at ~5.5% opacity; accents sky **#7DD3FC / #38BDF8** (the old orange accent is retired); risk colours restated exactly: danger **#FF3B30**, warning **#FFB020**, safe **#2ECC71**; text **#E5E7EB**, muted **#94A3B8**.
- Type: Space Grotesk headings, Inter body, JetBrains Mono for data values (stat numbers, dataset band, chart values, validation figures, PSI accession badges, decision path).
- Cards/panels/verdicts: radius 18px, 24px padding (investigation cards 20px); subtle sky glow on primary buttons, active nav, preset/goto hovers and investigation-card hovers; sky focus rings on form fields.
- New component styles: `.cta-row/.cta` (gradient primary + ghost), `.dataset-band`, `.cite-strip`. Responsive breakpoints unchanged, with the dataset band stacking to one column ≤900px.

### app.js (animation timing only — no logic changes)
- Section card entrances: 0.45s → **0.8s** with `power2.out` ease.
- Investigation-card grid entrances: 0.35s → **0.6s** `power2.out`.
- Home counters: 1.6s → **1.15s**. No-GSAP fallback path untouched (counters/values land on final values, as verified in screenshots).

### Verification (design v2)
- Served locally over HTTP; built-in `?selftest=1` — **10/10 PASS at root and under the `/flame-in-freefall/` subpath** (identical results to v1, incl. PMMA@21% → 43 rows, PMMA@Moon → GAP, predictor abstains at O₂ 60%).
- **Zero JavaScript console errors** in headless Chrome on both paths.
- Screenshots inspected: Home (new hero, CTAs, stat cards, dataset band, footer strip), Cabin Check (default verdict + rows render, citation strip under the section), Home at 400px width (nav wraps, CTAs and band stack cleanly).
- Caveat carried over from v1: the sandbox's headless Chrome cannot reach the internet, so the Google Fonts and GSAP CDNs cannot load *in the test environment* — screenshots render with the font/animation fallbacks. On GitHub Pages / any online browser both CDNs load normally. No sample/mock content was adopted — no invented ratings, labels or charts were added.
