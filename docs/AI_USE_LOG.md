# AI USE LOG — FIRENEX

Declared for the Space Apps original-work attestation. Each team member records the AI tools they personally used, what for, and how they verified the output.

## Syed Muneer ul Hassan Bukhari
- **Tool:** Spark Open by Meta
- **Used for:** data extraction and cleaning checks, analysis code, model training, hostile self-audits.
- **Verification:** every output verified against the NASA source files (see `docs/data-verification.md` — all headline numbers recomputed from the PSI downloads, never taken from the tool's own output).

## Fizza Malik — Team Lead
- **Tools:** Claude; ChatGPT
- **Used for:** building the FIRENEX presentation layer (discovery sections, Research Library, Ask Flame interface) with Claude; final testing review of the published site with ChatGPT.
- **Verification:** all changes reviewed against the live app and the NASA PSI source data before merging.

## Abdul Rafay
- **Role:** Model evaluation review and AI-use governance
- **Tool:** Claude (Anthropic LLM assistant)
- **Used for:** reviewing the Safe Predictor (depth-4 decision-tree classifier trained on 273 FLEX droplet-test rows; features: fuel, O2 %, pressure; target: extinction vs no extinction); critiquing the validation setup (stratified 80/20 holdout, n=55; 74.5% accuracy vs 67.3% majority-class baseline); checking the out-of-distribution abstention gate, which refuses predictions outside the training envelope; cross-checking the app's retrieval-based Tested-or-Silent logic, where every answer comes from a real NASA test row and no generative model produces scientific content.
- **Verification:** metrics and claims suggested by Claude were re-checked against model.json, the training script (train_model.py) and the live app before use.

## Mahadi ur Rehman Siddiqui
- **Role:** QA Tester & Evidence Validator — testing the FIRENEX application, reviewing its features, checking experimental results against NASA PSI data, identifying bugs or inconsistencies, and reporting findings to the development team.
- **Tools:** ChatGPT (Thinking mode); Claude (Anthropic LLM assistant)
- **Used for:** ChatGPT — understanding the project architecture, NASA experimental evidence, testing requirements and expected behaviour; developing test scenarios and analysing testing results. Claude — reviewing technical behaviour, interpreting potential issues, and evaluating findings during application testing.
- **Verification:** application outputs, experiment details, investigation IDs, DOIs and scientific claims reviewed against the NASA PSI data and cited sources; testing findings documented and shared with the development team. No code implementation or development was performed by him.

## Haider Zaman
- **Role:** Final submission lead — prepared the demo video and 7-slide presentation for the project page.
- **Tools:** ChatGPT (Thinking mode); Claude (Anthropic LLM assistant); Muse (Meta AI assistant)
- **Used for:** ChatGPT — understanding the project (its evidence story and tools) before preparing the submission materials. Claude — evaluating the FIRENEX project built by the team. Muse — producing the 30-second demo video (narration script, AI-generated visuals, burned-in subtitles, FIRENEX end card) and the 7-slide presentation (slide content and design) for the final submission.
- **Verification:** every number, fact and claim in the video and presentation was checked against the live FIRENEX app and the NASA PSI data it cites before submission; AI-generated visuals were reviewed and contain no NASA branding.

## Furqan Iftikhar
- **Tool:** ChatGPT
- **Used for:** testing and presentation support.
- **Verification:** outputs reviewed by the team before use.
