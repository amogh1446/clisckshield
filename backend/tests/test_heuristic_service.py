"""
Unit tests for ClickShield Heuristic Risk Analysis Service.
Verifies pure business logic without spinning up an HTTP server.
"""

import pytest
from app.services.heuristic_analyzer import HeuristicAnalyzer
from app.core.errors import InvalidURLException


@pytest.fixture
def analyzer():
    return HeuristicAnalyzer()


def test_benign_url_low_risk(analyzer):
    """Legitimate corporate websites should receive a Low risk score."""
    result = analyzer.analyze("https://www.google.com")
    assert result.url == "https://www.google.com"
    assert result.risk_level == "Low"
    assert result.risk_score < 0.30
    assert result.is_phishing is False
    assert result.is_mock is False


def test_phishing_url_with_ip_and_brand(analyzer):
    """An IP address hosting a fake brand login must be classified as High risk."""
    url = "http://192.168.1.100/paypal/login.php"
    result = analyzer.analyze(url)
    assert result.risk_level == "High"
    assert result.risk_score >= 0.70
    assert result.is_phishing is True
    features = [ind.feature for ind in result.top_indicators]
    assert "ip_address_host" in features
    assert "brand_impersonation" in features
    assert "suspicious_token" in features or "high_suspicious_token_count" in features


def test_suspicious_tld_and_hyphens(analyzer):
    """High-risk TLDs and typosquatting hyphens should elevate the risk score."""
    url = "https://secure-bank-login-verification.xyz/auth"
    result = analyzer.analyze(url)
    assert result.risk_score >= 0.30
    features = [ind.feature for ind in result.top_indicators]
    assert "suspicious_tld" in features
    assert "excessive_domain_hyphens" in features


def test_punycode_homograph_detection(analyzer):
    """Punycode (xn--) domains must trigger a homoglyph spoofing indicator."""
    url = "https://xn--pple-43d.com/signin"
    result = analyzer.analyze(url)
    features = [ind.feature for ind in result.top_indicators]
    assert "punycode_homograph" in features


def test_invalid_scheme_rejection(analyzer):
    """Non-HTTP schemes like ftp or javascript must be rejected."""
    with pytest.raises(InvalidURLException) as exc_info:
        analyzer.analyze("ftp://files.example.com/login")
    assert "Unsupported URL scheme" in str(exc_info.value)


def test_empty_url_rejection(analyzer):
    """Empty or whitespace-only URLs must raise InvalidURLException."""
    with pytest.raises(InvalidURLException) as exc_info:
        analyzer.analyze("   ")
    assert "URL must not be empty" in str(exc_info.value)


def test_missing_host_rejection(analyzer):
    """URLs lacking a valid hostname must raise InvalidURLException."""
    with pytest.raises(InvalidURLException) as exc_info:
        analyzer.analyze("http://")
    assert "valid hostname" in str(exc_info.value)
