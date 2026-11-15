# FIRENEX — Cabin Fire Safety from Real NASA Test Data

A web dashboard for the NASA Space Apps 2026 **Flame in Freefall** challenge. It turns NASA PSI combustion experiments (flight programmes) into fire-safety decisions for habitable crew cabins — organised as **Prevention, Detection, Suppression** — using real test data only. Where NASA never tested, the tools say **"NO TEST DATA"** instead of guessing.

## The method — FIRENEX
**FIRENEX: every answer comes from a real NASA test row — or the tool says NO TEST DATA.** Every answer in the app is produced only from real NASA PSI test rows, matched at the conditions those rows were actually tested at. Where no test row matches — or a question falls outside the tested envelope — the tool returns NO TEST DATA, or the model abstains, instead of extrapolating, interpolating, or guessing.

## Live app
https://firenex.vercel.app

## What's inside
- **Cabin Check** — pick a material + oxygen + pressure: verdict from matched real PSI test rows, with the source rows shown.
- **Inventory Screener** — a whole cabin material list → one traffic-light risk table for ISS / Moon (34% O₂) / spacesuit atmospheres.
- **Detection Panel** — the ISS smoke detector's own recordings (SAME-R, 68,699 readings): it barely responds to Kapton and Teflon smoke (median 0.001 V) while Silicone smoke moves it clearly (0.30 V). Plus Earth-vs-microgravity smoke behaviour from PSI-115 modelling grids.
- **Flame Lab** — a simplified grid simulation of flame spread, Earth vs microgravity side by side. The flame pictures are computed (a teaching model, not CFD and not recordings); the spread rate is anchored to the measured PSI-108 values and the detector meter reads against measured SAME-R medians. Measured and simulated content is labelled separately, at a glance.
- **Suppression View** — what actually extinguished flames in the tests (evidence-matched over real FLEX rows), and the Researcher's Guide finding that a local suppressant jet can keep a flame alive.
- **Safe Predictor** — a real scikit-learn decision tree trained on 273 FLEX droplet tests (holdout accuracy 0.745 vs 0.673 majority baseline — a margin of about 4 tests in 55) that **refuses to predict outside the tested envelope**.
- **Investigation Cards** — all 19 PSI combustion investigations as filterable cards with row counts, tested ranges and DOIs.
- **Open Archive** — all 2,012 backbone records, searchable and filterable, exactly as recorded (blank cells mean "not recorded", never zero).

## Data (all real, all cited in-app)
- 2,012 cleaned PSI experimental-table rows, 19 investigations (NASA Physical Sciences Informatics, https://psi.nasa.gov)
- SAME-R (PSI-101) raw detector housekeeping files — 44 files, 68,699 readings
- PSI-115 smoke-modelling grids (9,446,715 values, summarised)
- PSI-117 cool-flame proceedings data — labelled as model/proceedings data, never presented as ISS test rows
- PSI-108 SSCE flame-spread report values

Investigation DOIs: PSI-10 (10.60555/w4zy-bt45) · PSI-20 (10.60555/vb93-3y72) · PSI-21 (10.60555/23e1-9950) · PSI-22 (10.60555/se5a-8c73) · PSI-23 (10.60555/k57n-p030) · PSI-25 (10.60555/4qc4-de67) · PSI-26 (10.60555/58h4-dy80) · PSI-39 (10.60555/m6pj-a914) · PSI-47 (10.60555/ztgj-d202) · PSI-68 (10.60555/byp8-h018) · PSI-69 (10.60555/mbq8-0451) · PSI-98 (10.60555/0t15-1z43) · PSI-99 (10.60555/2chp-m469) · PSI-100 (10.60555/040q-4h36) · PSI-101 (10.60555/2np7-jv14) · PSI-102 (10.60555/gd4k-8h62) · PSI-106 (10.60555/pm12-rg61) · PSI-107 (10.60555/9kbh-e962) · PSI-159 (10.60555/cyt1-kh64). Plus PSI-115 (10.60555/q0v5-1v28) and PSI-117 (10.60555/gz0q-b577).

The Moon cabin condition used across the app is NASA's recommended exploration atmosphere for lunar habitats — 8.2 psia, 34% O₂ (NTRS 20240003211, "Moon to Mars: Exploration Atmosphere").

No assumed values and no demo data anywhere: every number in the app traces to one of these files. See `BUILD-REPORT.md` for the full audit, `docs/claims.md` for the claim-by-claim source table, and `docs/data-verification.md` for the recomputed numbers.

## Limitations
- **Backbone provenance:** the 2,012-row backbone is the SPICA project's public cleaned compilation of the PSI experimental tables. The team re-verified it against direct PSI downloads — row counts reproduced for all 19 investigations (2,001 of 2,012 rows by count; the 11-row difference is expansions and filtered non-test rows — see `docs/data-verification.md`).
- **Model validation is modest:** the Safe Predictor's holdout is n = 55 (accuracy 0.745 vs 0.673 baseline — about 4 tests in 55). It is presented as a modest model, and it abstains outside its tested envelope.
- **Flame Lab is a simplified simulation**, not data and not CFD: flame geometry is computed from simple rules; only its anchors (PSI-108 spread rates, SAME-R detector medians, FLEX outcome shares) are measured values, and they are labelled as such.
- **No trained suppression model exists in this project:** the PSI tables record no diluent type or fraction for any test, so a "which gas, how much" model would be invented. The Suppression View is an evidence lookup instead.
- **Coverage ≠ outcome:** most PSI tables record test conditions, not burn outcomes; where a table has no outcome column (e.g. BASS solids), the app shows coverage only and says so.

## AI assistance
AI assistance: Spark Open by Meta — used for data extraction, analysis code, model training. All results were verified against the NASA source data. Per-person detail: `docs/AI_USE_LOG.md`.

## Running locally
```bash
python3 -m http.server 8000
# open http://localhost:8000
```
(Browsers block data loading on `file://`, so serve over HTTP.)

## Build scripts
- `prep_data.py` — source PSI data → the JSON files in `data/`
- `train_model.py` — trains the Safe Predictor tree and exports `data/model.json`

## Team
**Team IGNIX** — Team Lead: Fizza Malik (frontend — UI and presentation layer, testing review). Members: Syed Muneer ul Hassan Bukhari (backend — NASA PSI data pipeline, app core, model training), Abdul Rafay (model evaluation review and AI-use governance), Mahadi ur Rehman Siddiqui (QA testing and evidence validation), Furqan Iftikhar (testing and presentation support), Haider Zaman (final submission lead — demo video and 7-slide presentation).
Built for NASA Space Apps 2026; submission deadline Sun Nov 15, 2026, 23:59 local.

---

# FIRENEX — Team IGNIX Improvements

FIRENEX is the enhanced research interface developed by Team IGNIX, building on Muneer's original Flame in Freefall project.

Improvements include:
- Redesigned interface and visual identity.
- Research Library and investigation discovery.
- Evidence comparison and gap analysis.
- Ask Flame retrieval interface with abstention.
- Accessibility, responsive layout and reduced-motion improvements.

The original research, NASA data and technical foundation are preserved from the upstream project.

See `firnex_handover.md` for implementation details.
