# BUILD REPORT — Flame in Freefall web app
**Built:** Sat Nov 14, 2026 (solo build; teammates unavailable) · **Status: DEPLOYED to GitHub Pages (https://muneer-ul-hassan.github.io/flame-in-freefall/) and hostile-audited (see Audit section); the Final build section at the end of this report describes the Nov-14 consolidated upgrade, applied locally and verified — its redeploy is the parent agent's next step.**

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

## Audit — Nov 14 (hostile self-audit, judge-style)

Method: 30+ displayed numbers recomputed from the SOURCE files (cleaned.json, samer CSVs, psi115_summary.csv, model.json), not the app's own JSONs; all 31 external URLs curled (10 official resources, PSI-115/PSI-117 DOIs, 19 card DOIs — **all returned 200**); all 8 sections screenshot-inspected at desktop width plus Home + Cabin Check at 400px; ~35 scripted edge-case interactions via a headless-Chrome harness; self-test re-run after fixes.

### Defects found: 9 — all 9 fixed

1. **Card ranges silently truncated range-recorded rows** (prep_data.py + investigations.json). Card O₂/pressure ranges were built from the `*_min` columns only. PSI-68 card showed O₂ "17.0–17.0%" and pressure "7.3–7.3 psia"; the source rows record 17.0–30.0% and 7.35–44.09 psia. PSI-98 card O₂ max showed 21.5 vs a recorded 21.5–21.7 row. Fix: ranges now [min of mins, max of maxes]; regenerated JSONs — only backbone.json (added `kind`) and investigations.json changed, other three byte-identical.
2. **PSI-68 design-range rows counted as tests** (prep_data.py, app.js). PSI-68's 8 rows are a planned test-matrix summary (source `row_kind` says "do not count as tested points"), yet Cabin Check matched them — IsoOctane @ 23.5% returned "1 real test rows match". Fix: backbone slim rows now carry `kind`; Cabin Check and the Screener exclude design-range rows; a material with only design rows (IsoOctane, n-Octane, Decane, Ethanol, …) now honestly returns NO TEST DATA / NOT IN PSI DATA, and the PSI-68 card carries the note "Rows are the planned test-matrix summary (design ranges), not per-test records".
3. **Empty O₂ in Cabin Check produced a false verdict** (app.js). `Math.abs(x − NaN)` comparisons silently passed, so a cleared O₂ field returned "99 real test rows match PMMA at NaN% O₂". Fix: O₂ is now validated — a grey "Enter a valid O₂ value" verdict is shown instead; non-numeric pressure/flow are treated as blank (optional fields).
4. **Predictor answered with NaN inputs** (app.js). Cleared O₂ or pressure fields walked the decision tree and printed a confident prediction "at NaN% O₂ / NaN psia" (captured in a screenshot). Fix: runPredictor validates both inputs, and predict() itself abstains on non-finite numbers. All envelope boundaries re-verified after the fix (O₂ 12 ✓ / 34 ✓ / 11.99 abstain / 34.01 abstain; pressure 10.17 abstain / 10.18 ✓ / 44.85 ✓ / 44.86 abstain).
5. **Suppression no-match message printed "NaN%"** for empty inputs (app.js). Fix: same input validation as the Predictor.
6. **Detection intro misattributed the sample count** (index.html). "Computed from 68,699 raw telemetry readings across 45 tests" — the 45 analysed tests hold 63,397 samples (verified two ways: sum of per-test sample counts in samer_detection_by_test.csv, and an independent recount of in-test rows in the raw HKP files); 68,699 is the whole downloaded file corpus including 5,301 idle TestNumber-0 rows. Fix: sentence now reads 63,397 samples across the 45 tests.
7. **"Scatter channel median railed at −6.25 V" was wrong** (index.html). Recomputed from the raw PSI-101 HKP files over the same 200–1000 s smoke window as the source analysis: Lampwick test 80 scatter median −5.2307 V, test 82 −5.5473 V (matching samer_detection_by_test.csv and the app's own per-test table); −6.26 V is the channel minimum (the saturation floor the signal hit). Fix: text now says the channel "slammed into its −6.25 V saturation rail" and gives the true medians.
8. **Screener legend omitted a verdict the tool emits** (index.html). The default inventory shows NO O₂ DATA chips (Kapton, Teflon) but the method note defined only TESTED / NEARBY ONLY / GAP / NOT IN PSI DATA. Fix: NO O₂ DATA definition added.
9. **Small display inaccuracies** (app.js): (a) holdout accuracy displayed "75%" / baseline "67%" via Math.round — model.json says 0.745 / 0.673; now displayed as 74.5% / 67.3%. (b) 1-letter screener input "a" fuzzy-matched PMMA and returned full verdicts; substring matching now requires ≥3 characters. (c) Grammar: "(1 rows)" in the material dropdown and "1 real test rows" in verdicts — singular forms fixed in 6 places.

### Verified correct (sample of the recomputation)
- Detection by-material table == samer_detection_by_material.csv exactly (Silicone 0.300 / Pyrell 0.069 / Lampwick 0.020 / Kapton 0.001 / Teflon 0.001 V; 21 of 45 tests with no response).
- PSI-115 chart + table == psi115_summary.csv (8 cm Earth peak 7.50 vs microgravity 14.17; 10 cm 11.24 / 11.72; coverage 94.16/75.19/92.44/69.50%).
- Suppression bins and default match (Methanol 21% / 14.7 psia → 78 rows, 63 extinguished, 81%) recompute exactly from cleaned.json.
- Model stats (273 rows, classes 185/61/27, holdout n=55, accuracy 0.745, confusion 29/6/12/8, envelope O₂ 12–34%, 10.177–44.859 psia) all exact; PSI-108 card values (0.092 cm/s @35% O₂/1 atm → 0.547 @50%/2 atm) exact; all 19 card row counts and DOIs exact.
- README and this report's earlier claims spot-checked (PMMA@21% → 43 rows; suppression default; self-test 10/10): all hold.

### Findings left open (judgement calls, not fixed)
- **F1 (low):** Home stat-2 source line and the dataset band cite 68,699 SAME-R readings — that is the full downloaded corpus (44 files incl. idle rows), while the analysed 45 tests hold 63,397 samples. Both numbers are now used consistently with their context, but a strict judge could ask for the distinction on the Home page too.
- **F2 (low):** 119 backbone rows are day-aggregates (PSI-20/21/22/23), not per-test records; the app calls all backbone rows "test rows". This is the PSI tables' own structure, but it is not distinguished in the UI.
- **F3 (info):** This report's header status ("NOT pushed, NOT deployed") reflects build time; deployment state is tracked outside this file.
- **F4 (info):** Mir card wording "burned for several minutes" is vaguer than the commonly reported ~14 minutes; left as deliberately conservative.

### Post-fix verification
- `?selftest=1`: **10/10 PASS at root and under `/flame-in-freefall/`**, zero FAIL lines, no page JS errors (only Chrome-internal component messages).
- Harness re-run: every previously broken case now returns the honest grey/abstain state; previously correct cases (PMMA@21% → 43 rows, Moon GAP, predictor boundaries, card filters 19/5/2/9/3) unchanged.
- Fixes are LOCAL only — the live GitHub Pages copy still serves the pre-audit build until the changed files (index.html, app.js, data/backbone.json, data/investigations.json, prep_data.py, BUILD-REPORT.md) are re-uploaded.


---

# Final build — Nov 14, 2026 (consolidation pass)

Everything from the hostile audit, the competitor gap analysis, the full-feature
inventory (69 features), the data-ideas feasibility file and the winner-brainstorm
red team was consolidated into this folder in one pass. New prep code:
`prep_final.py` (alongside `prep_data.py`) — every new number below was computed
by it from the source files in `~/workspace/nasa-challenge/data/`; a full re-run
reproduces `data/extra.json` and `data/archive.json` byte-identically (73,735 B /
1,158,274 B). Self-test extended from 10 to **26 assertions — 26/26 PASS at the
server root AND under the `/flame-in-freefall/` subpath**, zero page JS errors
(Chrome console shows only Chrome-internal component messages). Screenshots
checked: Home, Cabin Check, Detection, Predictor, Archive at desktop width and
Detection/Home at 400 px.

## P0 — red-team fixes + identity
- **DONE — "Tested-or-Silent" named in the app:** method banner directly under
  the hero (name + the pack's definition verbatim) and a method card in
  References. Also in the README.
- **DONE — pre-run refusal card on Home:** computed at load by the real
  `cabinCheck()` — PMMA has 180 test rows, tested up to 22.2% O₂, **0 matched
  rows at 34% O₂ / 8.2 psia**. The "Run it yourself" button deep-links to Cabin
  Check pre-filled (`#cabin` + state handoff; `?mat=&o2=&p=` URL params also
  work) — verified in the rendered DOM and by self-test.
- **DONE — 68,699 vs 63,397 clarified** in a note directly under the dataset
  band (and the Detection source lines already carried it): downloaded corpus
  vs samples inside the 45 analysed tests.
- **DONE — "2,012 records" wording** wherever day-aggregate rows are in scope
  (hero counters, dataset band, screener note, archive); BUILD-REPORT header
  status corrected (deployed + audited).
- **DONE — data-class trust chips:** TEST DATA / MODELLING / REPORT / MODEL
  chips label every major output (Home stats, quiz, replay, pairing, wake-up,
  distributions, PSI-117, PSD, frontier, scatter, predictor + map + burn,
  archive, method card explains the system).

## P1 — planned upgrades
- **DONE — SAME-R telemetry replay:** three real HKP traces (test 66 Silicone,
  62 Kapton, 82 Lampwick) from `data/replay.json` (downsampled ×2 for display,
  readings unmodified), play/pause/scrub, per-channel min–max scaling with the
  exact values under the cursor; labelled precisely as a replay of raw SAME-R
  HKP telemetry with an explicit "no claim to be the first" line. Self-test
  asserts Kapton's obscuration range (0.121 V) < Silicone's (1.433 V).
- **DONE — real NASA imagery, downloaded (no hotlinks), credited on-page:**
  Saffire-IV PMMA flame row (jsc2023e046631, og:image), Saffire-IV burning
  fabric sample (jsc2023e046375, Detection), GRC candle 1-g vs microgravity
  comparison (GRC-1998-C-00485, References). Two GRC "SAFFIRE" downloads whose
  metadata did not match their actual content (electronics bench photos) were
  rejected and deleted — no unverified caption ships.
- **DONE — PSI-115 smoke stills + case switcher:** 8 cm and 10 cm pairs
  rendered from the .dat grids (240×960, shared colour scale per pair, µg peak
  ≈2× Earth), with the feasibility file's caveat text verbatim.
- **DONE — 90-second judge tour:** five stops (Home gap → pre-run Moon refusal
  → Kapton-62 replay → suppression 63/78 → predictor abstention at O₂ 60%),
  caption bar with step counter, `?tour` deep link; the tour drives the real
  tools (real Cabin Check run, real replay test, real predictor run).
- **DONE — gap→experiment card:** every NO TEST DATA / GAP result (Cabin Check,
  Screener gap list) now appends the experiment that would settle it, generated
  from the user's own material/O₂/pressure inputs (Brainstorm Idea 4's five
  evidence threads).
- **DONE — full 2-D evidence-frontier MATRIX** (Cabin Check): fuel family × O₂
  band counts computed live from the backbone, 1,214 non-design records with
  O₂; ISS 21% / Moon 34% / Suit 100% band markers; the solids row is empty from
  25% up — the gap as one picture.
- **DONE — predictor decision/refusal map:** the exported tree evaluated over
  the O₂×pressure plane (Methanol) — green/red answer regions, grey refusal
  region; self-test probes an outside-envelope cell through the real predict().
- **DONE — PSI-117 cool-flame section:** all 93 tidy rows charted, model (39)
  and experiment (54) as separate series, never merged; the no-cross-check
  finding stated on the card.

## P2 — mining buildables (inventory order)
1. **DONE — detector-pairing card:** per-material channel medians computed from
   the HKP files (Kapton obscuration 0.0008 / Teflon 0.0006 → "the beam misses
   it"; Silicone scatter median −6.248 V = railed at the floor).
2. **DONE — predict-then-reveal quiz** ("Which smoke does the detector
   miss?"), answers from the same computed medians.
3. **DONE — investigation Compare:** any 3 cards side by side (tested ranges,
   families, outcomes recorded-or-not), built from `investigations.json`.
4. **DONE WITH DOCUMENTED SUBSTITUTION — condition scatter:** the brief's
   O₂×flow plane is unsupported (only **19** backbone records record both O₂
   and airflow — computed). The scatter ships as **O₂×pressure (989 records)**
   by family, and the substitution + the 19-row fact are stated on the card.
5. **DONE — in-app downloads:** the whole dataset release copied to
   `data/downloads/` (7 data files + release README), linked from References.
6. **DONE — Earth-applications panel:** the three verified NASA Spinoff nodes
   (9582 / 9407 / 9918), framed as report content.
7. **DONE — evidence-linked response sequence:** Detect → Ventilate? →
   Suppress → Watch, each step citing only findings already in the app
   (SAME-R medians, the Researcher's Guide ventilation finding, the 63/78
   suppression result, the FLEX cool-flame record).
8. **DONE — predictor nearest-training-rows:** the 273 training rows ship in
   `extra.json`; every prediction lists its 5 nearest real tests (normalised
   O₂/pressure distance, same fuel) with their recorded outcomes.
9. **DONE — glossary tooltips:** six PSI terms dotted-underlined wherever they
   appear in section intros (event-delegated, no markup rewriting).
10. **DONE — ⌘K quick jump:** palette over all 9 sections (Ctrl/⌘+K, sidebar
    button, filter + Enter).
11. **DONE — burn-rate mini-view (verified usable):** `burn_time_s` exists on
    268 PSI-69 FLEX rows with O₂ (Methanol 156, Heptane 112) — ships as a
    recorded burn-time scatter + binned-median table. NO fitted curve: FLEX
    rows record no droplet diameter in the backbone, so a burn *rate* constant
    cannot be computed — stated on the card.

## P3 — data-ideas buildables
- **DONE — Open Archive:** all 2,012 records browsable/filterable (investigation,
  class, material, search, O₂-overlap range, outcome-only), nulls shown as "not
  recorded —", rows expand to the full record. `data/archive.json` (1.13 MB,
  lazy-loaded only when the section opens).
- **DONE — detector wake-up timing:** computed per the feasibility spec
  (thresholds obsc −0.05 V / scatter −0.5 V / ion +0.05 V, 10-s rolling median
  sustained 10 s, from elapsed 200 s); 37 tests (8 STS-configuration tests
  excluded per spec); feasibility caveat text verbatim. Anchors reproduced:
  test 66 obscuration wakes 62 s from window start; test 62 all channels 55 s.
- **DONE — response distributions:** per-test peak obscuration drops (45 real
  points), STS-configuration runs flagged ◆ in the legend and tooltip text.
- **DONE — cross-investigation overlap:** recomputed in prep — 18 materials in
  ≥2 investigations, 36 tested once, 54 distinct materials (matches the
  feasibility file).
- **DONE — particle-size curves:** number-PSD vs node diameter (nm, log–log),
  Earth vs microgravity, 8 cm and 10 cm cases, 44 nodes per curve, from the
  PSI-115 analysed grids; uncalibrated-units caveat on the card.
- **DONE — archive honesty meter:** outcomes recorded on 546 / 2,012 records =
  27.1% (recomputed), with the record-kind split (1,885 per-test / 119
  day-aggregate / 8 design-range).
- **DONE WITH CONSTRAINT — flow-field overlay:** shipped as **direction-only**
  unit vectors over both case pairs (a magnitude-scaled quiver was rendered,
  inspected and rejected as unreadable/misleading); the toggle is labelled
  "flow direction". U/V ranges from the analysed files are printed on the card.
- **SKIPPED per brief — knowledge timeline** (experiment-era version impossible
  honestly; the "when data became public" strip was not trivially cheap from
  verified fields, so it was not built rather than padded).

## Hardening found during verification
- Entrance animations changed from opacity-0 starts to **transform-only**: a
  mid-animation screenshot during verification showed whole sections ghosted —
  the exact P1 failure mode the brainstorm warned about. Content can no longer
  be left invisible by an interrupted tween; counters remain baked static
  values, GSAP is vendored locally (`vendor/gsap.min.js`, 72 KB — no CDN
  dependency anywhere), and the page is fully correct with JS animation absent.

## New/changed files (final build)
- `prep_final.py` (new, 16.8 KB) — all new data prep; stills render with the
  system python3 (matplotlib is not in flame-venv; the script skips that step
  gracefully and says so).
- `data/replay.json` 61,667 B · `data/wakeup.json` 3,823 B · `data/extra.json`
  73,735 B · `data/archive.json` 1,158,274 B · `data/downloads/` 8 files,
  96,085 B total.
- `assets/` (new): candle-compare.jpg 96,416 B · saffire-flame.jpg 166,029 B ·
  saffire-pmma.jpg 16,055 B · 8 smoke stills + overlays, 32–82 KB each.
- `vendor/gsap.min.js` 72,214 B (GSAP 3.12.5, vendored).
- `index.html` 61,408 B · `app.js` 65,046 B · `style.css` 16,683 B (rewritten /
  extended in place; all pre-existing tool behaviour preserved — the original
  10 self-test assertions still pass inside the 26).
- Repo total: 37 files, 3,052,359 B (~3.0 MB) — sane for GitHub Pages.

---

## Audit #2 — Nov 14 (hostile audit of the FINAL build, ordered by the user)

Standard: every number recomputed from the SOURCE files in
`~/workspace/nasa-challenge/data/` with independent code (never the app's own
JSONs/prose, never just re-running the prep scripts). The auditor did NOT
deploy; the fixes below are local, for the parent agent to deploy.

### Verified exact (independent recomputation)

- SAME-R corpus: 44 HKP files recounted row by row — 68,699 physical rows =
  63,397 samples in the 45 tests + 5,301 Test-Number-0 idle rows + exactly 1
  repeated header row (the file `7_23_09...` contains two header lines).
- All 45 by-test detection stats recomputed from raw HKP (baseline median
  elapsed <120 s, test 63 = earliest 60 samples, window 200–1000 s): every
  obscuration/scatter/ion median, drop and % value matches the shipped CSV/app
  (residual diffs ≤0.05 are the CSV's own 1-dp rounding). No-response = 21,
  STRONG = 9. By-material medians all match (Silicone 0.2997, Pyrell 0.06895,
  Lampwick 0.0202, Kapton 0.00075, Teflon 0.0006; Kapton recomputes to
  0.00076 — 5th-decimal rounding in the shipped CSV, not a defect).
- Replay: replay.json regenerated byte-exact for tests 66/62/82 from the raw
  files (dedupe by elapsed second, ×2 downsample confirmed, 4-dp rounding).
  Deck-screenshot readout (test 62 @621 s: 3.406 / −1.76 / 0.489) matches the
  raw HKP row at 621 s exactly.
- Wake-up timing: an independent implementation of the frozen spec reproduces
  wakeup.json for all 37 tests × 3 channels with ZERO differences. ZERO-POINT
  SETTLED: app values are seconds FROM the smoke-window start (elapsed 200 s)
  and the on-page method text says exactly that; the feasibility note's
  ≈258/251 s were ABSOLUTE elapsed times under an unfrozen "first move"
  definition (200+62 = 262, 200+55 = 255; residuals come from the frozen
  10-s-median + sustained rule). Anchors: test 66 obsc/scat/ion = 62/63/65 s,
  test 62 = 55/55/55 s.
- Backbone: cleaned.json = 2,012 rows; kinds 1,885 per-test / 119
  day-aggregate / 8 design-range; honesty 546 outcomes = 27.1%; solids with
  O₂ = 140, max 22.2%. backbone.json and archive.json are faithful
  projections — 0 differing rows out of 2,012 in each. Frontier matrix
  matches cell-for-cell (total 1,214; solids row empty ≥25% O₂). Condition
  scatter = exact 989-point list match. "Only 19 records have both O₂ and
  flow" is literally true (19 of all 2,012; 11 excluding design-range rows —
  the on-page sentence says "backbone records"). Overlap 18 multi / 36
  single / 54 materials, material sets exact. Training rows 273 (classes
  185/61/27), envelope O₂ 12–34% / 10.177–44.859 psia exact. Burn view 268
  points (156 Methanol / 112 Heptane), all 10 binned medians exact.
  Suppression: default match 78 rows / 63 extinctions exact; all 10
  extinction-by-O₂ bins exact; FLEX-with-outcome total 274 exact. BASS 251
  rows, no outcomes, O₂ 13.6–22.2% exact. PMMA: 180 rows, 0 record pressure,
  max midpoint O₂ 22.2; @21%/14.7 psia → 43 matched (all outcome-free →
  coverage-only verdict, correct); @Moon 34%/8.2 → 0 matched AND 0 nearby.
- Model: holdout INDEPENDENTLY retrained (auditor's own split code):
  n=55, accuracy 0.745, majority baseline 0.673, confusion 29/6/12/8 —
  identical to model.json. Exported tree internally consistent (leaf counts
  sum to root 273 = [88, 185]). Predictor decision map replicated in Python
  from model.json: 2,704 cells/fuel, 680 abstentions each, consistent with
  the envelope gate. (Note: a stale research note claiming "logistic
  regression, 98 of 371 rows" is WRONG — the shipped and retrained model is
  the depth-4 decision tree on 273 rows.)
- PSI-115: all four Smoke cases recomputed from the .dat grids — peak/mean/%
  match the app to full float precision (8 cm: 7.5013/0.5462/94.16 Earth,
  14.1726/0.8052/75.19 µg; 10 cm: 11.2407/0.8098/92.44, 11.7154/0.8302/69.5).
  PSD: 44 node diameters (1.24 nm–138.5 µm) and all 4 curves exact.
- PSI-117: extra.psi117 is a field-exact copy of the tidy CSV (93 rows;
  54 experiment / 39 model, never merged in the chart renderer).
- Investigations: 19 cards rechecked against cleaned.json (counts, O₂
  ranges, outcomes, DOIs all exact; pressure ranges see F2).
- Images: BOTH Saffire IDs verified against NASA's Image Library API —
  jsc2023e046631 = "Plexiglass burning in Saffire-IV" (PMMA ✓),
  jsc2023e046375 = "fabric sample burns in Saffire-IV… image appears green"
  (fabric blend ✓, explains the green tint). Candle image verified visually
  (Earth teardrop vs µg blue dome; imprint C-1998-485 = GRC-1998-C-00485 ✓).
  All 4 PSI-115 smoke stills are pixel-faithful renders of the real grids
  (correlation ≥0.9999 vs a faithful re-render, shared per-case colour scale,
  origin lower).
- Trust chips: every labelled output's class is correct (PSI-115 =
  MODELLING in stat, card and stills; PSI-117 = MODELLING with split series;
  suppressant jet = REPORT; PSI-108 = REPORT; NIST = REPORT; predictor =
  MODEL; replay/wake-up/pairing/distributions/burn = TEST DATA). Two gaps
  fixed — see D4.
- Downloads: all 8 files byte-identical to the dataset-release copies; the
  SAME-R CSVs also byte-identical to the analysis originals. Every README
  count re-derived (45 / 5 / 44 / 109 / 93 / 34 files' rows; 1,974 sentinel
  cells; n_values column sums to exactly 9,446,715). coverage-verdicts.json
  contains exactly the 34 materials with ≥1 per-test O₂ row (rule verified
  set-equal against cleaned.json; the 7 excluded O₂-materials are PSI-68
  design-range-only fuels; PMMA entry verified: 99 O₂ rows, 0 pressure).
- Links: 15 static external links + all 19 investigation DOIs + 8 local
  downloads fetched — all resolve (the two font preconnect origins return
  404 on the bare origin, expected; the stylesheet itself is 200).
- Live-vs-local: index.html, app.js, style.css, all 9 data JSONs, og image,
  one smoke still and 3 download files fetched from the live Pages URL —
  ALL byte-identical to local. Live ?selftest=1 cannot run in the sandbox
  browser (no internet from headless Chrome); local self-test substituted:
  26/26 PASS at root AND subpath, before and after the fixes below.

### Defects found and FIXED (local only — deploy pending)

- D1. SAME-R clarifier arithmetic off by one row: the dataset-band note
  implied 68,699 − 63,397 = idle rows only; the remainder is 5,301 idle rows
  PLUS 1 repeated header row. Text now reads "…(the rest are idle rows
  between tests, plus repeated file headers)". (index.html)
- D2. PSI-117 legend showed dataset totals ("Experiment (54 rows)" /
  "Model / CFD (39 rows)") while the chart plots only the 58 rows that
  record a cool-flame diameter (30 experiment + 28 model; 35 rows record a
  burning rate or hot-flame diameter only). Legend now shows plotted counts
  and the card text states the 58/35 split. (index.html)
- D3. Unverifiable field-wide claim removed: "No rival FLEX predictor in
  this challenge shows its refusal zone" — the 61-project mining found no
  rival refusal map, but the claim covered the whole challenge field.
  Sentence now claims only that most of OUR map is refusal. (index.html)
- D4. Two output cards carried no evidence-class label, against the site's
  own labelling rule: the response-sequence card (now labelled "SYNTHESIS —
  each step cites its own source") and the Earth-applications panel (now
  REPORT). (index.html)
- D5. assets/candle-compare.jpg was documented (above) as shipped but was
  referenced nowhere in the app. Now wired into the Home section with its
  verified caption/credit (NASA GRC-1998-C-00485). (index.html)

### Clarification (not an error)

- Downloads README §7 now states the coverage-verdicts inclusion rule
  (34 = materials with ≥1 per-test O₂ row; PSI-68 design-range fuels and
  no-O₂ materials excluded). Applied identically to both README copies
  (app data/downloads/ and dataset-release/), which remain byte-identical.

### Open findings (no fix — recorded deliberately)

- F1. The 9,446,715 headline is exactly the sum of the team's
  psi115_summary.csv n_values column (traceable to the shipped file). A raw
  token recount of the 44 .dat files gives 9,446,971 (+256, +0.003%) because
  the summary counts two-column PSD files by data rows, not scalar values.
  Every analysis number reproduces exactly from the grids; headline left
  unchanged to stay traceable to the shipped summary.
- F2. Five investigation cards (PSI-10/39/68/69/159) display pressure ranges
  rounded to 1 dp — all verified as correct roundings of the backbone
  values. Display precision only.
- F3. PSI-117 card sentence "most of this dataset is CFD and
  conference-proceedings data" stands at dataset level: all 93 tidy rows are
  CFD model output or proceedings-published experiment tables (39 model /
  54 experiment, plotted unmerged).
- F4. Home PMMA figure caption calls Saffire "the largest fires ever
  deliberately set in space" — NASA Glenn's own framing of Saffire;
  subject and image ID verified. Left as is.
- F5. The header of this report ("its redeploy is the parent agent's next
  step") was already stale at audit time: the final build WAS redeployed
  and live-verified 2026-11-14 10:43 PKT. This section supersedes it; the
  D1–D5 fixes + README clarification are the new pending redeploy.

### Changed files (for the parent agent to deploy)

- `flame-app/index.html` (D1–D5)
- `flame-app/data/downloads/README.md` (§7 clarification; the identical edit
  was also applied to `nasa-challenge/dataset-release/README.md`, which is
  outside the deployed app tree)

Self-test after fixes: 26/26 PASS (root and subpath). No other files
changed; no data JSON was touched — every shipped data file verified exact
as-is.

---

## Depth-visibility pass — Nov 14, 2026 (Home only)

The build's depth was real but sat behind nav clicks; this pass surfaces it
on Home. Additions only — **no existing number, text, tool or data file was
changed.**

- **"Inside this app" inventory band** (Home, under the dataset band): eight
  counted components, each a `data-goto` link to its section — 19 PSI
  investigations (investigations.json length) · 2,012 Open Archive records
  (archive.json rows) · 45 SAME-R tests analysed from raw telemetry
  (detection.json `by_test`, = `headlines.samer_tests_analysed`) · 3 ISS
  detector recordings replayed (replay.json tests 66/62/82) · 9,446,715
  PSI-115 smoke-modelling values (psi115_summary n_values column sum, the
  figure Audit #2 re-derived) · 273 real FLEX tests behind the predictor
  (model.json `n_rows`) · 34 materials with an O₂-coverage verdict in the
  released tables (coverage-verdicts.json, rule verified set-equal in
  Audit #2) · 546 archive records that record an outcome (extra.json
  honesty count, = the Archive's own assertion). Every count was re-counted
  from the shipped data files during this pass, not copied from prose.
- **Archive peek** (Home, directly under the band): a card rendering the
  first five archive records (Test B1–B5, PSI-25) at runtime from
  `data/archive.json` via the Archive's own `archRowHtml` renderer and
  column set (`renderHomePeek()` in app.js, called from `initFinal`), plus
  a runtime-computed "…and 2,007 more records" line (2,012 − 5) linking to
  the full Archive. Peek rows are de-clicked via CSS (the Archive's row
  expansion stays an Archive-only behaviour).
- **Verification line** at the foot of Home: "Every number on this page was
  recomputed from the source files in two independent audits." — linking to
  References & Method. No defect counts printed (per brief).

Files changed: `index.html` (band + peek card + verification line),
`style.css` (`.inv-band/.inv-item/.inv-num/.inv-label`, peek de-click rules,
`.verify-line`; band collapses 4→2 columns at ≤900 px), `app.js`
(`renderHomePeek()` + one call in `initFinal`), this report. No data JSON
touched.

Verification: served locally; built-in `?selftest=1` — **26/26 PASS at the
server root AND under the `/flame-in-freefall/` subpath**, zero FAIL lines.
DOM check: peek renders exactly 5 `ar-row`s (Test B1–B5) and the "2,007"
remainder; all 8 inventory items present; verification line present.
Screenshots inspected: Home at desktop width (band as a clean 4×2 grid,
peek table identical in style to the Archive's, nothing clipped or
ghosted) and at 400 px (band in 2 columns, widest figure 9,446,715 fully
inside its cell; peek table scrolls inside its `.scroll-table` wrapper
exactly like the Archive's own table — no page-level overflow). NOT
deployed — redeploy is the parent agent's step, as before.

## Flame Lab — simplified grid simulation (Nov 14, 2026)

New section `sec-flamelab` (nav under DETECTION, after Detection Panel; also
in the Cmd-K palette). One MODELLING-chipped card; the lede and card title
say "simplified simulation". Local build only — NOT deployed.

**The simulation.** Two 64×48 cell grids side by side (Earth — 1 g;
Microgravity — ISS), same centre ignition, same 6-row fuel surface along the
bottom. Cells ignite → burn → burn out by preheat rules; nothing is a
hand-drawn flame shape. Flame and smoke are particles moved by each world's
flow rule: Earth gets a buoyant updraft (plume stretches up, smoke rises and
disperses), microgravity gets diffusion only (flame stays a round blue blob,
smoke accumulates around it — captioned to the PSI-115 finding already in
the app: µg smoke concentrates, peak ≈ 2× Earth's in the 8 cm case).

**Spread rate — anchored, not tuned.** The O₂ slider (21–50%) sets the
surface front speed from the two measured PSI-108 values only: 0.092 cm/s
at 35% O₂ / 1 atm and 0.547 cm/s at 50% O₂ / 2 atm. Between the anchors the
rate is interpolated linearly; below 35% it is clamped at the 35% anchor
(0.092 cm/s), labelled exactly that — no extrapolation. A surface cell's
ignition delay is cell-width ÷ rate (0.875 cm per cell at the printed scale
×40 real time · 1 cm = 8 px), and the cell logic runs in ≤0.1 sim-second
substeps so the front tracks the anchored rate: Node harness measured cell
ignitions within ~4% of ideal across 12 cells at the 50% anchor. The live
readout prints "measured (PSI-108)" only at 35% and 50%, "≈X — interpolated
between measured anchors" between them, and the below-anchor clamp label
under 35%. NOTE: backbone.json contains no PSI-108 rows (the values come
from the PSI-108 SSCE report text, as the Suppression card already
credits), so per the no-guessing rule the anchors are labelled "PSI-108"
only — no material name attached.

**Toggles.** Ventilation off: Earth's front stops, its burning cells die
down ~2.6× faster and the plume collapses; the µg sim is untouched and
persists (caption quotes the Researcher's Guide behaviour). Cool flame
(PSI-117): ~40% of cells that burn out while it is on pass through a faint
pale-blue state before going dark (caption: cool flames can keep burning
invisibly after visible extinction). Fuel (Methanol/Heptane) swaps ONLY the
printed stats and the burn-out tendency parameter: stats are the stored
suppression.json values — Methanol shows the Suppression View's own
cabin-conditions figure (63 of 78 at 21% O₂ / 14.7 psia, recomputed live
through the same supMatch() so it cannot drift) plus its stored 20–24% O₂
bin (60 rows, 46 extinguished, 76.7%); Heptane shows only its stored bin
(43 rows, 23 extinguished, 53.5%) and an explicit "no figure stored, so
none is printed" for cabin conditions. Each fuel's bin share sets its
self-extinguish probability in the sim — the honesty box calls this a
teaching-model mapping of a droplet-test outcome, not a measured spread
property, and states the PSI-108 anchors do not change with fuel.

**The detector's eye.** A smoke-material selector (Silicone / Lampwick /
Pyrell / Kapton / Teflon) and an ISS-detector meter fed by the µg sim's
accumulated smoke. The reading rises toward the material's measured SAME-R
obscuration median, read at runtime from data/detection.json
(by_material[].obsc_drop_med_V: Silicone 0.2997, Pyrell 0.06895,
Lampwick 0.0202, Kapton 0.00075, Teflon 0.0006 — displayed rounded to
0.300 / 0.069 / 0.020 / 0.001 / 0.001 V, matching the app's existing
prints). Label on the card: "Smoke is simulated; the response levels are
the measured SAME-R medians." For Kapton/Teflon the meter stays at the
floor while the smoke visibly piles up — the miss, demonstrated.

**Moon cabin preset.** Button sets the O₂ slider to 34%, outlines the µg
grid, and shows the banner verbatim: "Moon cabin: 34% O₂, 8.2 psia. No
solid material has ever been tested at this oxygen level — this picture is
a model; the tested verdict is NO TEST DATA." with a data-goto link to
Cabin Check. At 34% the readout shows the below-anchor clamp label.
Touching the slider manually exits the preset.

**Housekeeping.** Reset/replay button + automatic replay ~4 s after a run
fully burns out. The rAF loop no-ops while the section is hidden or the tab
is hidden. prefers-reduced-motion: one static frame (ignition patch lit)
plus a "simulation paused" note, no loop. No data JSON touched, no existing
text or number changed, no external assets. Added weight ≈ 23.5 KB
(index.html +7.2 KB, style.css +1.7 KB, app.js +14.6 KB).

**Verification.** Existing self-test 26/26 PASS at server root AND under
/flame-in-freefall/, zero FAIL, on the final code. A Node harness (DOM
stubs, app's own functions) passed 17/17 dynamics checks: flRate exact at
both anchors, linear midpoint 0.3195 at 42.5%, clamped at 21% and 34%;
front position vs anchored rate at 35% and 50%; Earth + ventilation off
touches exactly 1 surface cell while µg front reaches 12; cool state
appears after burnouts; detector saturates at 0.0007 V for Kapton vs
0.300 V for Silicone under identical smoke; both fuels' stats print exactly
the stored figures. Puppeteer (real-time) checks: 5 s at 35% → both fronts
spread, µg smoke accumulating, meter at 0.166 V rising toward the Silicone
target; Kapton selected → meter decays to the 0.001 V floor with the
"detector miss" note; Moon preset → slider 34, banner shown, µg outlined,
below-anchor readout; cool on → 13 cool-state cells per grid at 6 s;
readout at 50% → the exact measured string. Screenshots inspected at
desktop (side-by-side grids, flames visible, controls usable) and 400 px
(grids stack, document scrollWidth == 400, no overflow). The only console
entries were the pre-existing Google Fonts fetch (no internet in this
sandbox) and favicon 404 — zero JS errors. NOT deployed — redeploy is the
parent agent's step, as before.

**Visual rendering pass (Nov 14):** flames re-rendered as additive radial-gradient sprites over a soft body glow (per-front teardrop plume on Earth; µg flame particles redistributed into a disc so the round blue ball actually forms) — rendering only, no logic/number/claim changes; self-test still 26/26 at root + subpath, mid-burn screenshots verified at desktop + 400 px.

**Visual rendering pass — iteration 2 (Nov 14):** Earth flames redrawn as layered, noise-deformed teardrop silhouettes per burn cluster (round glow orb removed; clusters now computed over all fuel rows, gap-merged and capped at 3 bodies, so no particle patch sits without a flame body); the µg ball is built from concentric radial layers with a capped pale core (≤⅓ of the radius, never pure white), a crisp rim boundary and uniform breathing, with flame-particle alpha cut from .42 to .15 so additive stacking can no longer blow out the centre; the fuel surface is one smooth gradient band with smooth burned/cool extent washes and a thin top edge — no per-cell speckle anywhere. Rendering only; self-test still 26/26 at root + subpath, zero JS errors, ~60 fps, mid-burn screenshots verified at desktop + 400 px and the reduced-motion still re-verified.

**Visual rendering pass — iteration 3 (Nov 14):** final polish, rendering only — the Earth teardrop now leans one-sided (per-flame lean from the seed) with different peak heights and stronger uneven noise per edge, so it no longer reads as a mirrored shape; layer gradients gained stops and the inner layers' alphas dropped, so core→yellow→amber→orange blends without visible banding; the flame base is sunk 8 px into the surface with a low foot glow, so the foot sits in the ember glow; the detached tip fragments are removed and Earth texture particles now render only inside the teardrop's own height-dependent silhouette profile — nothing renders above or outside a flame body; the µg view draws ONE ball on the principal burning run (the run containing the ignition column, else the widest run) via a new render helper, with a calmer interior — particles switched to a soft no-hot-centre sprite at .07 alpha and drawn only inside the ball, so the inside is a smooth layered glow with no mottling and no detached second ball (secondary runs show only the surface ember glow); sunken µg smoke far from the ball is no longer rendered on the ground band. Simulation logic, data, controls and every printed text/number unchanged; self-test still 26/26 at root + subpath, zero JS errors, mid-burn screenshots (early + late burn) verified at desktop + 400 px and the reduced-motion still re-verified.

**Visual rendering pass — iteration 4 (Nov 14):** the µg rim stroke is removed entirely and the ball is no longer a perfect circle — a new render helper draws the envelope as a noise-deformed closed path (radius wobbles ±5% via a sin/cos angle field, continuous around the turn, evolving slowly), filled by a radial gradient (white-blue core → cyan → deep blue) whose own falloff reaches transparency at the edge, with a wider two-stage soft halo spilling beyond it and three large, very soft glow masses drifting slowly inside (clipped to the envelope) — the sphere now reads as a volume of burning gas, not a solid planet/glass ball, with no return of the iteration-2 small-spot mottling. Earth layers are feathered into each other (extra expanded low-alpha passes on the outer/amber/yellow layers, main-layer alphas eased, wider inner layers) so they melt into one flame with internal colour variation instead of stacked leaf silhouettes, and the teardrop edge noise is height-weighted (calm base, lively edges/tip) with a fine high-frequency term. The ground burned/cool washes are now horizontal gradients that feather out at both ends (clipped to the band) — no rectangular blocks. Rendering only; simulation logic, data, controls and every printed text/number unchanged; self-test still 26/26 at root + subpath, zero JS errors, ~60 fps, screenshots (early + mid + late burn) verified at desktop + 400 px and the reduced-motion still re-verified.
