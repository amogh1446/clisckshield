"""
Feature Extraction Module (Placeholder for Phase 1).

Extracts structural, lexical, and domain-based numerical features
from a raw URL string without executing network requests.
"""

from typing import Dict, Any


FEATURE_NAMES = [
    "url_length",
    "hostname_length",
    "path_length",
    "num_dots",
    "num_hyphens",
    "num_at_symbols",
    "num_question_marks",
    "num_equal_signs",
    "num_slashes",
    "has_ip_address",
    "num_subdomains",
    "is_https",
    "suspicious_token_count",
    "digit_ratio",
]


def extract_url_features(url: str) -> Dict[str, Any]:
    """
    Extracts numerical feature vector from a single URL string.

    Args:
        url: The web URL to inspect.

    Returns:
        Dictionary mapping feature names to numerical values.
    """
    # Placeholder implementation: Returns a empty or default vector
    # Real extraction logic will be implemented in Phase 4.
    raise NotImplementedError(
        "Feature extraction will be fully implemented in Phase 4 (ML pipeline)."
    )
