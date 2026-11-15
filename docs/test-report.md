# TEST REPORT — final build, live and local

Build tested: the final consolidated build (all audit fixes applied). Self-test and interaction battery run at the server root and under the `/flame-in-freefall/` subpath (the GitHub Pages condition), at desktop width and 400 px.

## Results

| Test | Result |
|---|---|
| Built-in self-test (`?selftest=1`) | **26/26 PASS** at root and subpath, zero JavaScript errors |
| Cabin Check battery (12+ cases): PMMA @21%/14.7; PMMA @34%/8.2; query without pressure; Nomex; Methanol; Heptane; a material not in the list; O₂ empty / 0 / 100 / 150 / negative / text input; all three presets (ISS, Moon, Spacesuit) | All correct — matched-row verdicts where data exists, NO TEST DATA / clean validation states elsewhere; no nonsense verdicts from empty or impossible inputs |
| Inventory Screener: empty input; misspelling; single letter; long list | Empty → one-line hint (no bare table); unknown names → NOT IN PSI DATA; normal lists → per-atmosphere verdict table |
| Safe Predictor boundaries: O₂ 12 and 34 → answer; O₂ 11.99 and 34.01 → abstain; pressure 10.18 and 44.86 → answer; pressure 44.87 → abstain; O₂ 60% → abstain; unknown fuel → abstain | All correct — the displayed envelope boundary itself is accepted, anything outside abstains |
| Detection Panel: replay play / pause / scrub (3 exemplar tests: 66 Silicone, 62 Kapton, 82 Lampwick); predict-then-reveal quiz; per-material chart; 45-test table; wake-up timing chart; response distributions | All working; replay traces byte-exact against the raw HKP files |
| Suppression lookup (incl. O₂ 99% edge case) | Matched-row evidence where it exists; clean NO MATCHED state outside |
| Flame Lab: O₂ slider 21/35/50% readouts; Moon preset; Methanol/Heptane toggle; five smoke materials; ventilation toggle; cool-flame toggle; reset/replay | All working; on a 400 px phone viewport the simulation runs at ≈54 fps; SIMULATED vs MEASURED labels render cleanly |
| ⌘K command palette | Opens, filters, navigates |
| 90-second judge tour (`?tour`) | All 5 stops present and in order |
| Open Archive: search, filters, row expand, outcome-only filter | Working; outcome-only returns exactly 546 records |
| NaN / "undefined" sweep across all sections and tool outputs | Clean — no NaN, no "undefined", no blank value slots |
| Mobile layout (400 px) | No horizontal overflow in any of the 10 sections |
| Links — investigation DOIs | 21/21 DOIs resolve (200) |
| Links — data downloads | All 8 download files resolve (200) |
| Links — Evidence Brief and build report (from app References) | Both resolve (200) |
| Links — the 10 official challenge resources | 9/10 return 200; the ScienceCasts YouTube link returns 429 (rate-limit) from the test environment — the video ID is unchanged from the challenge page |

## Notes
- All fixes from the three hostile self-audits were re-verified after application (26 defects and gaps in total — see `BUILD-REPORT.md`).
- The only console entries observed in the offline test sandbox are the sandbox's own Google Fonts fetch failure and a favicon 404; the app ships GSAP vendored locally and is fully functional with all CDNs blocked.
