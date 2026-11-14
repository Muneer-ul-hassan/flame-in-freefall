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
