# DATA VERIFICATION — headline numbers, recomputed from the source files

Every number below was recomputed from the downloaded PSI source files (never from the app's own JSONs) and matched against what the app displays. Method detail: `BUILD-REPORT.md`.

## Backbone (PSI experimental tables)
| Quantity | Recomputed | App shows |
|---|---|---|
| Total records | 2,012 | 2,012 ✓ |
| Investigations | 19 | 19 ✓ |
| Records with a recorded outcome | 546 (27.1%) | 546 (27.1%) ✓ |
| Row kinds | 1,885 per-test / 119 day-aggregate / 8 design-range | same ✓ |
| Solids: maximum recorded O₂ | 22.2% (over 140 solid rows that record an O₂ value) | 22.2% ✓ |
| Backbone re-verification vs direct PSI downloads | Row counts reproduced for all 19 investigations: 2,001 of 2,012 rows by count. Net 11-row difference: BRE +25 rows and s-Flames +5 rows are expansions in the backbone; E-FIELD −11, SAFFIRE-2 −6, SAFFIRE-1 −2 are filtered non-test rows. 14 of 19 accessions match count-for-count | stated in References ✓ |

## Cabin Check spot values
| Query | Recomputed | App shows |
|---|---|---|
| PMMA at 21% O₂ / 14.7 psia | 43 matched rows | 43 ✓ |
| PMMA at 34% O₂ / 8.2 psia (Moon) | 0 matched rows | 0 → NO TEST DATA ✓ |
| Methanol at 21% O₂ / 14.7 psia (Suppression lookup) | 78 matched FLEX rows, 63 extinguished | 78 / 63 ✓ |

## SAME-R detector data (PSI-101)
| Quantity | Recomputed | App shows |
|---|---|---|
| Downloaded corpus | 44 HKP files, 68,699 rows (= 63,397 analysed samples + 5,301 idle rows + 1 repeated header row) | 68,699 / 63,397 ✓ |
| Tests analysed | **45** — the 46th distinct TestNumber (0) is the idle bucket holding the 5,301 between-test rows, not a test | 45 ✓ |
| Median obscuration drop — Silicone | 0.2997 V | 0.30 V ✓ |
| Median — Pyrell | 0.06895 V | 0.069 V ✓ |
| Median — Lampwick | 0.0202 V | 0.020 V ✓ |
| Median — Kapton | 0.00075 V | 0.001 V ✓ |
| Median — Teflon | 0.0006 V | 0.001 V ✓ |
| Tests with no detector response (median drop < 0.005 V) | 21 of 45 | 21 of 45 ✓ |

## PSI-115 smoke modelling
| Quantity | Recomputed | App shows |
|---|---|---|
| Total values across 44 grid files | 9,446,715 | 9,446,715 ✓ |
| 8 cm case peak concentration — microgravity vs Earth | 14.1726 vs 7.5013 (≈2×) | 14.17 vs 7.50 ✓ |

## Safe Predictor model (PSI-69 FLEX)
| Quantity | Recomputed | App shows |
|---|---|---|
| Rows recording an outcome | 274 | 274 ✓ |
| Training rows (outcome + pressure recorded) | 273 (one Methanol row — FLEX test 114, O₂ 20.0%, Extinction — records no pressure) | 273 ✓ |
| Holdout (n = 55) accuracy vs majority baseline | 0.745 vs 0.673 (a margin of about 4 tests in 55) | 0.745 vs 0.673 ✓ |
| Confusion (TP/FP/TN/FN) | 29 / 6 / 12 / 8 | 29/6/12/8 ✓ |
| Tested envelope | O₂ 12–34%, pressure 10.18–44.86 psia | same ✓ |

## PSI-117 cool flames
| Quantity | Recomputed | App shows |
|---|---|---|
| Tidy extraction rows | 93 | 93 ✓ |
| Rows recording a cool-flame diameter | 58 (30 experiment / 28 model — plotted separately, never merged) | 58 ✓ |

## Archive traceability
20 archive rows drawn at random were traced back to the original NASA PSI tables: **20/20 matched**.

## PSI-108 flame spread (report text, not a table)
0.092 cm/s @35% O₂/1 atm · 0.150 @35%/1.5 atm · 0.358 @50%/1 atm · 0.454 @50%/1.5 atm · 0.547 @50%/2 atm — all five verified verbatim in the SSCE report text.
