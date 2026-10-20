# Machine Learning Subsystem — Phishing Detection & Explainability

This module contains the data preprocessing, feature engineering, model training, and SHAP explainability pipelines for the phishing detection system.

**Assigned Team Member**: Member 1  
**Target Feature Branch**: `feature/ml-model`

---

## 📁 Directory Architecture

```text
ml/
├── data/                 # Raw and cleaned dataset files (CSVs git-ignored)
├── notebooks/            # Exploratory Data Analysis (EDA) and experimental prototypes
├── src/                  # Production-ready Python modules
│   ├── preprocessing.py  # Data cleaning, deduplication, label encoding
│   ├── feature_extraction.py # Lexical, domain, and structural URL feature extractors
│   ├── train.py          # XGBoost model training and hyperparameter tuning
│   ├── predict.py        # Inference pipeline (input URL -> feature vector -> prediction)
│   └── explain.py        # SHAP TreeExplainer wrapper returning top risk factors
├── models/               # Saved model artifacts (.json, .joblib, git-ignored)
├── evaluation/           # Evaluation metrics, confusion matrices, and ROC curves
├── requirements.txt      # Python dependencies for ML
└── README.md             # This documentation file
```

---

## 🔬 Planned Feature Categories

1. **Lexical Features**:
   - URL length, path length, query length.
   - Count of special characters: `-`, `@`, `?`, `=`, `.`, `//`.
   - Ratio of digits to alphabet characters.
   - Detection of IP address in host.
2. **Domain & Host Features**:
   - Subdomain count and depth.
   - Top-Level Domain (TLD) category and reputation.
   - Entropy of domain string (detecting randomly generated domain names).
3. **Keyword & Phishing Indicators**:
   - Presence of security / authentication keywords (`login`, `secure`, `verify`, `account`, `banking`, `update`).
   - Homograph / punycode detection.

---

## 🚀 Windows Setup (Member 1)

```powershell
cd ml
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

---

## 📌 Phase Status

- **Current (Phase 1)**: Scaffolding, architecture, and module placeholder interfaces defined.
- **Next for ML (Phase 4)**: Implementation of `feature_extraction.py`, dataset ingestion in `data/`, model training in `train.py`, and SHAP explainers in `explain.py`.
