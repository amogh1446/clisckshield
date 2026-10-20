"""
Data Preprocessing Module (Placeholder for Phase 1).

Responsible for:
- Loading raw CSV/Parquet datasets containing phishing and benign URLs.
- Sanitizing, stripping whitespace, and normalizing URL schemes.
- Removing duplicates and balancing classes.
- Splitting data into train, validation, and test splits.
"""

from typing import Tuple
import pandas as pd


def load_raw_dataset(file_path: str) -> pd.DataFrame:
    """
    Loads raw URL dataset from CSV.
    
    Args:
        file_path: Path to dataset file.
        
    Returns:
        DataFrame with columns ['url', 'label'].
    """
    raise NotImplementedError("Dataset loading will be implemented in Phase 4.")


def clean_and_normalize(df: pd.DataFrame) -> pd.DataFrame:
    """
    Cleans URLs, removes invalid rows, and standardizes formats.
    """
    raise NotImplementedError("Data cleaning will be implemented in Phase 4.")


def split_dataset(
    df: pd.DataFrame, test_size: float = 0.2, random_state: int = 42
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Splits dataset into stratified training and testing sets.
    """
    raise NotImplementedError("Data splitting will be implemented in Phase 4.")
