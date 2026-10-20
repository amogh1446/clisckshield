# Machine Learning Datasets

This directory holds the training and evaluation datasets for the phishing classifier.

---

## 📌 Dataset Guidelines

1. **Large Files Git-Ignored**: All `.csv`, `.parquet`, `.zip`, and `.tar.gz` files in this directory are intentionally excluded from version control via `.gitignore`.
2. **Sources**:
   - Benign URLs: Tranco top 1M or Alexa top domains.
   - Phishing URLs: PhishTank (verified online valid phishes), OpenPhish community feeds, or academic phishing benchmarks.
3. **Storage Format**:
   - `raw_urls.csv`: Original collected URLs with binary label (`0 = benign`, `1 = phishing`).
   - `processed_features.parquet` / `features.csv`: Extracted numeric feature matrices ready for model training.

> ⚠️ **SAFETY WARNING**: Never navigate to or execute unverified URLs in this directory using a standard web browser. Handle all data as inert strings.
