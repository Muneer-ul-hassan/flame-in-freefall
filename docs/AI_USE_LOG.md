# AI USE LOG — FIRENEX

Declared for the Space Apps original-work attestation. Each team member records the AI tools they personally used, what for, and how they verified the output.

## Syed Muneer ul Hassan Bukhari
- **Tool:** Spark Open by Meta
- **Used for:** data extraction and cleaning checks, analysis code, model training, hostile self-audit.
- **Verification:** every output verified against the NASA source files (see `docs/data-verification.md` — all headline numbers recomputed from the PSI downloads, never taken from the tool's own output).

## Fizza Malik — Team Lead
- **Tool:** Claude; ChatGPT
- **Used for:** Building the FIRENEX presentation layer (discovery sections, Research Library, Ask Flame interface) with Claude; final testing review of the published site with ChatGPT; demo video and presentation.
- **Verification:** All changes reviewed against the live app and the NASA PSI source data before merging.

## Abdul Rafay
- **Role:** Model evaluation review and AI-use governance
- **Tool:** Claude (Anthropic LLM assistant)
- **Used for:** Reviewing the project's machine-learning component (Safe Predictor: a depth-4 decision-tree classifier trained on 273 FLEX droplet-test rows; features: fuel, O2 %, pressure; target: extinction vs no extinction). Used Claude to critique the validation setup (stratified 80/20 holdout, n=55; 74.5% accuracy vs 67.3% majority-class baseline) and to check the out-of-distribution abstention gate, which refuses predictions outside the training envelope. Also used Claude to cross-check the app's retrieval-based Tested-or-Silent logic, where every answer comes from a real NASA test row and no generative model produces scientific content.
- **Verification:** Metrics and claims suggested by Claude were re-checked against model.json, the training script (train_model.py) and the live app before use.

## Mahadi ur Rehman Siddiqui
- **Tool:** ChatGPT
- **Used for:** Testing and presentation support.
- **Verification:** Outputs reviewed by the team before use.

## Furqan Iftikhar
- **Tool:** ChatGPT
- **Used for:** Testing and presentation support.
- **Verification:** Outputs reviewed by the team before use.

## Haider Zaman
- **Tool:** ChatGPT
- **Used for:** Testing and presentation support.
- **Verification:** Outputs reviewed by the team before use.
