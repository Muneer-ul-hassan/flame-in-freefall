# Flame in Freefall — Derived Dataset Release

**What this is:** the derived summary tables behind the Flame in Freefall dashboard
(NASA Space Apps 2026), released so anyone can re-check our headline numbers without
re-downloading and re-parsing the raw NASA files. Every table here was computed by our
team from public data in NASA's **Physical Sciences Informatics (PSI)** database
(psi.nasa.gov). No values in these files are invented, interpolated, or modelled by us —
where a number is a summary, the method is stated below.

**Provenance note:** all underlying data is NASA PSI public data. These files are
*derived summaries by the Flame in Freefall team* — NASA did not produce or endorse
these tables. One file (`PSI-101_Experimental table_SAME-R.csv`) is the original PSI-101
experimental index table, included unmodified because it defines the "109 tests"
denominator used in our coverage caveats.

---

## Files

### 1. `samer_detection_by_test.csv` — 45 rows (one per analysed test)
Per-test detector response for the SAME-R smoke experiment, computed from the raw ISS
housekeeping (HKPData) telemetry files: test number, material, sample count, duration,
baseline obscuration median (V), smoke-window obscuration median (V), obscuration drop
(median, V), % of the smoke window below 3.30 V, and scatter / ion-channel medians.
- **Method:** baseline = median of samples at elapsed < 120 s (pre-heating); smoke
  window = elapsed 200–1000 s. Test 63 (Pyrell) has no pre-heating rows; its baseline
  is the median of its earliest 60 samples.
- **Source:** PSI-101, *Smoke Aerosol Measurement Experiment-Reflight (SAME-R)*,
  ISS flight experiment, NASA Glenn Research Center. DOI: **10.60555/2np7-jv14**.

### 2. `samer_detection_by_material.csv` — 5 rows (one per material)
The by-test table rolled up by material (Kapton 14 tests, Silicone 9, Pyrell 8,
Lampwick 7, Teflon 7): median obscuration drop (V) with min/max, median % of window
below 3.30 V, median ion-channel response. Headline result: median obscuration drop
**0.300 V for Silicone vs 0.001 V for Kapton and 0.001 V for Teflon**; 21 of the 45
tests show no obscuration response at all (drop < 0.005 V).
- **Source:** PSI-101 (SAME-R), DOI: **10.60555/2np7-jv14**.

### 3. `samer_summary.csv` — 44 rows (one per raw telemetry file)
File-level inventory of the 44 downloaded HKPData files: rows per file, test numbers
covered, max elapsed time, obscuration max/mean, scatter max, and the per-file count of
sentinel cells. Totals across the 44 files: **68,699 rows** and **1,974 sentinel
cells**. The 45 analysed tests in file 1 hold **63,397 samples**; the remaining rows
are idle Test Number 0 rows (5,301) and repeated header rows, all excluded from the
analysis.
- **Source:** PSI-101 (SAME-R), DOI: **10.60555/2np7-jv14**.

### 4. `PSI-101_Experimental table_SAME-R.csv` — 109 rows (original PSI table, unmodified)
The SAME-R experimental index as published in PSI-101: sample type, test number,
description, date, inlet velocity, duration and aging/mixing times for all **109**
tests in the investigation. Included so the coverage caveat below is checkable from
this release alone.
- **Source:** PSI-101 (SAME-R), DOI: **10.60555/2np7-jv14**.

### 5. `psi115_summary.csv` — 44 rows (one per analysed grid file)
Per-file statistics for the PSI-115 smoke-modelling grids (8 cm and 10 cm cases,
Earth gravity vs microgravity; variables include Smoke, NumDen, PSD, Temperature and
velocity components): value count, min, max, mean, and % of values above zero.
The `n_values` column sums to **9,446,715 values**. Headline result (Smoke variable,
8 cm case): peak concentration **14.17 in microgravity vs 7.50 on Earth**.
- **This is modelling/simulation data, not flight measurements** — it is labelled as
  such everywhere we use it.
- **Source:** PSI-115, *Utilization of the Smoke Aerosol Measurement Experiment Data
  for Advanced Modeling and Simulation of Smoke Generation in Micro-Gravity*.
  DOI: **10.60555/q0v5-1v28**.

### 6. `psi117_extinction_tidy.csv` — 93 rows
Tidy consolidation of the PSI-117 cool-flame extinction tables: source file, fuel
(n-heptane, n-decane, n-dodecane), pressure (atm), cool-flame extinction diameter,
hot-flame extinction diameter, burning-rate constant (mm²/s), and a `value_type`
column distinguishing **experiment** rows from **model** rows. Consolidated from four
PSI-117 analysed-data files (MST 2024 extinction-diameter and burning-rate tables;
PROCI 2023 alkane extinction-diameter tables at 1 atm and vs pressure).
- **This table has no oxygen column and no yes/no extinction outcome** — that absence
  is itself one of our findings (it is why the dataset cannot cross-check an
  extinction predictor).
- **Source:** PSI-117, *Effect of External Thermo-Convective Perturbation on Cool
  Flame Dynamics* (CFD/proceedings dataset built on FLEX flight data).
  DOI: **10.60555/gz0q-b577**.

### 7. `coverage-verdicts.json` — 34 materials/fuels
Per-material test-coverage verdicts computed from the 2,012-row PSI combustion
backbone (19 investigations): for each material, the number of backbone rows recording
an O₂ value and a pressure value, the tested O₂ levels (min/max and the distinct
levels), and — for reference cabin atmospheres stored in the file — the nearest tested
O₂, its distance in percentage points, and a coverage verdict. These are **coverage
verdicts** (was this material tested near these conditions?), never burn/no-burn
verdicts: several source PSI tables record no outcome column, and this file does not
pretend otherwise.
- **Source:** PSI combustion investigations PSI-10, 20, 21, 22, 23, 25, 26, 39, 47,
  68, 69, 98, 99, 100, 101, 102, 106, 107, 159 (per-investigation DOIs are listed in
  the app's References & Method section).

---

## Caveats — read before reusing

1. **45 of 109 SAME-R tests.** Only 45 of the 109 SAME-R tests listed in the PSI-101
   experimental table have raw time-series files in the repository (tests 58–108).
   Tests 48–57 and 109–114 have no raw HKPData file. All SAME-R statistics in this
   release describe those 45 tests only — not the full 109.
2. **Sentinel values (−999).** The raw HKPData files use sentinel values for missing
   readings — most visibly **−999** in the DustTrak/PTrak particle-counter channels
   (uncalibrated raw counts; excluded from our analysis), and −10 V sentinels inside
   the excluded idle (Test Number 0) rows. `samer_summary.csv` counts 1,974 sentinel
   cells across the 44 files so the scale of missingness is visible. Never average
   raw HKPData columns without removing sentinels first.
3. **Scatter −6.25 V is a saturation rail**, not a physical reading: when the scatter
   channel hits −6.25 V the detector is saturated. Per-test scatter medians in file 1
   are real medians; the rail appears as the channel minimum.
4. **STS-detector runs.** 8 runs in the experimental table (tests 67, 68, 69, 70, 87,
   89, 91, 92) used a different detector configuration and show ~no obscuration
   response for *every* material, including Silicone. That looks like a configuration
   effect, not a material effect. The Kapton/Teflon flat result also holds on the
   remaining 37 runs, so the material ranking stands — but do not quote the STS runs
   as material evidence.
5. **No alarm threshold exists in these files.** "No response" in our tables means
   the detector signal stayed at baseline while smoke was being generated. It does
   **not** mean an alarm failed to sound, and these tables cannot support that claim.
6. **Model vs experiment.** PSI-115 is simulation output and PSI-117 mixes model and
   experiment rows (distinguished in the tidy table's `value_type` column). Neither
   should be cited as flight measurement.

## Suggested citation

> Flame in Freefall team (2026). *Derived summary tables from NASA PSI combustion
> investigations (PSI-101, PSI-115, PSI-117, and the 19-investigation PSI backbone).*
> NASA Space Apps 2026. Project: https://github.com/Muneer-ul-hassan/flame-in-freefall
> — Underlying data: NASA Physical Sciences Informatics (psi.nasa.gov): PSI-101
> (doi:10.60555/2np7-jv14), PSI-115 (doi:10.60555/q0v5-1v28), PSI-117
> (doi:10.60555/gz0q-b577).

## License / reuse

The underlying experimental data is NASA public data, available from PSI. These
derived tables are released by the Flame in Freefall team for reuse with attribution —
please cite the original PSI investigations (DOIs above), not only this release.
