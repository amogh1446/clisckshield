"""
Model Training Script (Placeholder for Phase 1).

Trains an XGBoost binary classification model to detect phishing URLs.
Saves model artifacts and performance evaluation reports.
"""

import argparse


def train_model(data_path: str, output_model_path: str) -> None:
    """
    Executes model training pipeline:
    1. Loads processed features.
    2. Fits XGBoost classifier.
    3. Evaluates with Precision, Recall, F1, and ROC-AUC.
    4. Saves model to output_model_path.
    """
    raise NotImplementedError(
        "Model training will be implemented in Phase 4. "
        "No model binaries are generated yet."
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train XGBoost Phishing Model")
    parser.add_argument(
        "--data", default="ml/data/features.csv", help="Path to training features"
    )
    parser.add_argument(
        "--output",
        default="ml/models/xgboost_phishing_model.json",
        help="Path to save model",
    )
    args = parser.parse_args()
    print("Training module placeholder. Phase 4 will implement model training.")
