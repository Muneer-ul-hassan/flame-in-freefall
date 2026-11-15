# CLAIMS — every headline claim, its source, and its status

Status key: **Verified** = checked against the primary source. **Softened** = the claim survives only in the scoped/hedged wording shown. **Dropped** = removed.

| Claim | Source | Status |
|---|---|---|
| The Moon cabin condition (34% O₂, 8.2 psia) is NASA's recommended exploration atmosphere for lunar habitats — the EA recommendation "was revised to 8.2 psia and 34% O₂" | NTRS 20240003211, "Moon to Mars: Exploration Atmosphere" (https://ntrs.nasa.gov/citations/20240003211) | Verified — cited in the app References, README, submission pack and form |
| Apollo 1 (1967): fire in a pure-oxygen cabin during a launch-pad test killed all three astronauts | NASA SMA Apollo 1 article (official challenge resource) | Verified |
| Apollo 13 (1970): oxygen-tank explosion, no fire; crew rationed air and power for four days | NASA History, "Apollo 13: The Successful Failure" (official challenge resource) | Verified |
| Mir fire (1997) burned for "several minutes" — the wording on the site is the NASA article's own | NASA History, "25 years ago: fire aboard space station Mir" (official challenge resource) | Verified (source's own words, kept deliberately conservative) |
| NASA Spinoff fire-safety pages: Air Tanks (node 9582), Fire Detector (node 9407), Fire Attire (node 9918) | spinoff.nasa.gov nodes 9582 / 9407 / 9918 | Verified (all resolve; linked in the app References) |
| A suppressant jet can entrain air and sustain a flame (BASS finding) | Researcher's Guide to ISS Combustion Science, p. 31 (and p. 22) | Verified |
| Turning ventilation off does not self-extinguish a microgravity flame (the "ventilation misconception") | Researcher's Guide, p. 35 | Verified |
| Earth-based (BASS) flammability testing is not conservative for spacecraft conditions | Researcher's Guide, p. 31 (and p. 23) | Verified |
| Cool flames can persist invisibly after visible extinction | PSI-117 dataset (DOI 10.60555/gz0q-b577) + Researcher's Guide pp. 33–34, 36 | Verified |
| PSI-108 flame-spread values: 0.092 cm/s @35% O₂/1 atm; 0.150 @35%/1.5 atm; 0.358 @50%/1 atm; 0.454 @50%/1.5 atm; 0.547 @50%/2 atm | PSI-108 SSCE report text, extracted from the PSI study files | Verified verbatim from the report text |
| The ISS photoelectric smoke detector responded poorly to Teflon and Kapton smoke (NIST finding) | NIST news release, 1 May 2018 (nist.gov) + Meyer et al., Fire Safety Journal 98 (2018), doi:10.1016/j.firesaf.2018.04.004 | Verified — both primary sources linked from the app's NIST card |
| "The Saffire series set the largest fires ever deliberately burned in space" | NASA's own framing of the Saffire series; Saffire-IV image jsc2023e046631, NASA Image Library | Verified as a series-level claim, attributed to NASA on the page |
| Image credits: Saffire-IV plexiglass (jsc2023e046631), Saffire-IV fabric (jsc2023e046375), GRC candle comparison (GRC-1998-C-00485) | NASA Image Library API records for each ID | Verified |
| "Three decades of NASA microgravity combustion tests" / "PSI microgravity combustion database" (blanket framing) | The backbone has no gravity field; its tables come from flight programmes and related experiments | **Softened** — now worded "NASA PSI combustion experiments (flight programmes)"; per-dataset microgravity claims (PSI-115, SAME-R, PSI-117) stay, as those datasets support them |
| "Solid materials were never tested above 22.2% O₂" | Computed from the backbone (max over 140 solid rows recording O₂) | **Softened** — scoped everywhere as "in the PSI data used here"; no claim about all NASA testing ever |
| Backbone = the team's own cleaning of PSI | The backbone is the SPICA project's public cleaned compilation of the PSI experimental tables | **Softened / corrected** — provenance stated openly in the app References, README and submission materials; the team's own contribution is the re-verification (row counts reproduced for all 19 investigations: 2,001 of 2,012 rows by count; the 11-row difference is expansions and filtered non-test rows — BRE +25 and s-Flames +5 expansions; E-FIELD −11, SAFFIRE-2 −6, SAFFIRE-1 −2 filtered non-test rows; 14 of 19 accessions match count-for-count) |
| Any "first / only" uniqueness claim for the detector replay | A rival Space Apps project (PHARAOHS) also replays Saffire sensor timelines | **Dropped** — the app states the replay "makes no claim to be the first of its kind" |
