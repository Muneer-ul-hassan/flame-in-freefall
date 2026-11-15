# EVIDENCE BRIEF — Flame in Freefall
**Method: Tested-or-Silent — every answer comes from a real NASA test row, or the tool says NO TEST DATA.**
App: https://muneer-ul-hassan.github.io/flame-in-freefall/ · Code: https://github.com/Muneer-ul-hassan/flame-in-freefall
Purpose: every headline number in the app and the project page, with its source and how it was verified. Nothing in this brief is asserted without a traceable origin.

## 1. Dataset inventory (what we actually used)

| Dataset | Content used | Source |
|---|---|---|
| PSI combustion backbone | **2,012 test rows, 19 investigations** (PSI-10, 20, 21, 22, 23, 25, 26, 39, 47, 68, 69, 98, 99, 100, 101, 102, 106, 107, 159) | NASA Physical Sciences Informatics (psi.nasa.gov); DOIs per investigation in the app |
| Backbone verification | **Row counts reproduced for all 19 investigations** from direct PSI downloads: **2,001 of the 2,012 rows by count**; the 11-row difference is expansions and filtered non-test rows (see the build report) | Team's own re-download and count-level comparison |
| SAME-R detector telemetry (PSI-101) | **44 raw housekeeping files; 68,699 readings** in the downloaded corpus; **45 tests analysed, holding 63,397 samples** (45 of the 109 SAME-R tests have raw files — this caveat is printed in the app) | PSI repository, raw detector recordings |
| PSI-115 smoke modelling | **44 data grids, 9,446,715 values** — labelled modelling data wherever shown | DOI 10.60555/q0v5-1v28 |
| PSI-117 cool-flame data | Fuel + pressure + extinction diameter; **labelled model/proceedings data** | DOI 10.60555/gz0q-b577 |
| PSI-108 (SSCE) | Flame-spread values extracted from the study's report text | PSI study files |

## 2. How each headline number was produced

- **22.2% O₂ — the solids ceiling.** *Computed*, not typed in: the maximum O₂ across the **140 backbone solid rows that record an oxygen value**. Compared against the lunar-cabin scenario of 34% O₂ / 8.2 psia (NASA's recommended exploration atmosphere for lunar habitats — NTRS 20240003211, "Moon to Mars: Exploration Atmosphere"), this gives the **11.9-point evidence gap** the tools display.
- **Detector medians (SAME-R).** The team's own count from the raw detector files: median obscuration drop per material — **Silicone 0.300 V, Pyrell 0.069 V, Lampwick 0.020 V, Kapton 0.001 V (14 tests), Teflon 0.001 V (7 tests)**; **21 of 45 analysed tests show no obscuration response at all**. Channel detail is preserved per test (e.g. Kapton test 62: scatter −1.67 V, ion 0.23 V; Lampwick tests 80/82 scatter medians −5.23 V / −5.55 V against a −6.25 V saturation rail, labelled as saturation in the app).
- **Smoke peak ≈2× (PSI-115).** Computed from the 44 downloaded grids: 8 cm case peak concentration **14.17 (microgravity) vs 7.50 (Earth)**; 10 cm case 11.72 vs 11.24. Always labelled as modelling data.
- **Flame spread ~6× (PSI-108).** From the SSCE report text: **0.092 cm/s at 35% O₂ / 1 atm → 0.547 cm/s at 50% O₂ / 2 atm**.
- **Suppression evidence.** Matched live from the test rows: methanol at 21% O₂ / 14.7 psia matches **78 FLEX rows, 63 of which extinguished (81%)**. The suppressant-jet warning is a qualitative finding from NASA's *Researcher's Guide to ISS Combustion Science* (2015), cited as a finding, never as a measurement.

## 3. Model card — Safe Predictor

- **Training data:** 273 PSI-69 (FLEX) rows with fuel, O₂, pressure and outcome recorded; fuels **methanol and heptane only**; outcome classes Extinction 185 / Disruption 61 / Completion 27, target = Extinction vs No-extinction.
- **Model:** scikit-learn decision tree (max depth 4, min samples per leaf 10), retrained on all 273 rows, exported to JSON; inference in the browser walks the same tree and shows the decision path.
- **Validation (stratified 80/20 holdout, seed 42, n = 55):** accuracy **0.745** vs **0.673** majority-class baseline; confusion TP 29 / FP 6 / TN 12 / FN 8. The app describes the model as "modest — beats baseline by ~7 points (a margin of about 4 tests in 55)."
- **Envelope gate (the Tested-or-Silent rule applied to the model):** answers only for methanol/heptane, O₂ **12–34%**, pressure **10.18–44.86 psia** — the training rows' own ranges. Outside, it abstains with a NO PREDICTION panel (verified: it refuses at 60% O₂). The gate abstained on 0 holdout cases — expected, since the holdout is drawn from inside the envelope; this is stated in the app, not hidden.

## 4. Impossibility findings — stated as method, not apology

- **No diluent/suppression model exists in this project, because the data cannot support one.** Field inspection plus a keyword scan of notes, materials and flags confirmed: **no diluent type or fraction field exists for any of the 2,012 backbone rows**, and the BASS/BASS-II solids tables (251 rows) record an **empty outcome column**. Any trained diluent model would be invented. Shipped instead: an evidence-matched lookup over real FLEX rows, labelled as a lookup.
- **No PSI-117 cross-validation of the predictor.** The PSI-117 table has no oxygen column and records extinction *diameter*, not a yes/no extinction outcome — the features and target the model needs do not exist there. The cross-check was documented as impossible rather than forced.
- **No-data states are shipped behaviour, not missing features:** Cabin Check beyond coverage → NO TEST DATA; verdicts from tables without an outcome column → "coverage only"; unknown materials → NOT IN PSI DATA; materials whose rows record flow but not O₂ (Kapton, Teflon) → NO O₂ DATA; 8 PSI-68 rows identified as a *planned test matrix* are excluded from verdict matching and labelled as design ranges. Matching tolerances (±2 O₂ points, ±5 in the wide search, etc.) are method parameters, printed openly in each tool.

## 5. Hostile self-audit (before submission)

The finished app was audited the way a sceptical judge would: **30+ displayed numbers recomputed from the source files** (not from the app's own data files), **all 31 external links checked live (all returned 200)**, all 10 sections screenshot-inspected, ~35 scripted edge-case interactions run (empty fields, boundary values, out-of-envelope queries). Result: **Three hostile self-audits found 26 defects and gaps between them; every one was fixed and re-verified.** First audit (9): a data-range computation error, design-range rows misclassified as tests, three missing input validations (empty fields producing nonsense verdicts), a misattributed sample count, a mis-stated detector-channel statistic, an incomplete verdict legend, and display-precision slips. Second audit (5): a sample-count arithmetic slip, PSI-117 legend counts, an unverifiable field-wide claim (removed), two output cards missing evidence-class labels, and a documented image that was referenced nowhere. Third audit (12): an unexplained 273-vs-274 row split between sections, a stale audit-count sentence, a referenced document that was not yet linked from the app, mobile table overflow in three sections, a pressure confound in the flame-spread comparison, missing search aliases for programme acronyms, an envelope display-precision trap, and five polish items. After the fixes, the app's built-in self-test passes **26/26** at both the site root and the deployment subpath, with zero JavaScript errors.

*AI use declaration: AI assistance: Spark Open by Meta — used for data extraction, analysis code, model training. All results were verified against the NASA source data.*
