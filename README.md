# Flame in Freefall — Cabin Fire Safety from Real NASA Test Data

A web dashboard for the NASA Space Apps 2026 **Flame in Freefall** challenge. It turns NASA's PSI microgravity combustion database into fire-safety decisions for habitable crew cabins — organised as **Prevention, Detection, Suppression** — using real test data only. Where NASA never tested, the tools say **"NO TEST DATA"** instead of guessing.

## Live app
GitHub Pages: https://muneer-ul-hassan.github.io/flame-in-freefall/

## What's inside
- **Cabin Check** — pick a material + oxygen + pressure: verdict from matched real PSI test rows, with the source rows shown.
- **Inventory Screener** — a whole cabin material list → one traffic-light risk table for ISS / Moon (34% O₂) / spacesuit atmospheres.
- **Detection Panel** — the ISS smoke detector's own recordings (SAME-R, 68,699 readings): it barely responds to Kapton and Teflon smoke (median 0.001 V) while Silicone smoke moves it clearly (0.30 V). Plus Earth-vs-microgravity smoke behaviour from PSI-115 modelling grids.
- **Suppression View** — what actually extinguished flames in the tests (evidence-matched over real FLEX rows), and the Researcher's Guide finding that a local suppressant jet can keep a flame alive.
- **Safe Predictor** — a real scikit-learn decision tree trained on 273 FLEX droplet tests (holdout accuracy 0.745 vs 0.673 majority baseline) that **refuses to predict outside the tested envelope**.
- **Investigation Cards** — all 19 PSI combustion investigations as filterable cards with row counts, tested ranges and DOIs.

## Data (all real, all cited in-app)
- 2,012 cleaned PSI experimental-table rows, 19 investigations (NASA Physical Sciences Informatics, https://psi.nasa.gov)
- SAME-R (PSI-101) raw detector housekeeping files — 44 files, 68,699 readings
- PSI-115 smoke-modelling grids (9,446,715 values, summarised)
- PSI-117 cool-flame proceedings data — labelled as model/proceedings data, never presented as ISS test rows
- PSI-108 SSCE flame-spread report values

No assumed values and no demo data anywhere: every number in the app traces to one of these files. See `BUILD-REPORT.md` for the full audit.

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
Data pipeline + AI/model: Muneer (with AI assistance, declared). Built for NASA Space Apps 2026; submission deadline Sun Nov 15, 2026, 23:59 local.
