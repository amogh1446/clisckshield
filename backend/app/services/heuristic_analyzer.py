"""
ClickShield Heuristic Risk Analysis Engine.

Performs static lexical, domain, and structural analysis on target URLs
to assess phishing probability without executing network requests or visiting
the target site.

NOTE: This is a rule-based heuristic analyzer, NOT a trained machine learning model.
It provides instant, explainable risk indicators as an initial line of defense.
"""

from datetime import datetime, timezone
import ipaddress
import re
from typing import List, Tuple
from urllib.parse import urlparse, unquote

from app.schemas.analysis import IndicatorItem, URLAnalysisResponse
from app.core.errors import InvalidURLException

# Target brand keywords frequently abused in phishing attacks
TARGET_BRANDS = {
    "paypal": "paypal.com",
    "apple": "apple.com",
    "google": "google.com",
    "microsoft": "microsoft.com",
    "netflix": "netflix.com",
    "amazon": "amazon.com",
    "facebook": "facebook.com",
    "instagram": "instagram.com",
    "chase": "chase.com",
    "wellsfargo": "wellsfargo.com",
    "bankofamerica": "bankofamerica.com",
    "binance": "binance.com",
    "coinbase": "coinbase.com",
}

# Credential harvesting and deception keywords
SUSPICIOUS_KEYWORDS = {
    "login",
    "signin",
    "verify",
    "verification",
    "update",
    "secure",
    "security",
    "account",
    "banking",
    "authenticate",
    "password",
    "credential",
    "confirm",
    "wallet",
    "recovery",
}

# Free or high-abuse top-level domains commonly used in zero-day phishing
SUSPICIOUS_TLDS = {
    ".tk",
    ".ml",
    ".ga",
    ".cf",
    ".gq",
    ".xyz",
    ".top",
    ".work",
    ".buzz",
    ".fit",
    ".casa",
    ".surf",
}


class HeuristicAnalyzer:
    """
    Evaluates URLs using static lexical and domain heuristics.
    Never establishes an outbound connection to the URL.
    """

    @staticmethod
    def validate_url(url: str) -> Tuple[str, str]:
        """
        Validates URL syntax and ensures it uses http or https.
        Returns parsed (scheme, hostname).
        Raises InvalidURLException if URL is invalid.
        """
        if not url or not isinstance(url, str) or not url.strip():
            raise InvalidURLException("URL must not be empty.")

        clean_url = url.strip()
        if len(clean_url) > 2048:
            raise InvalidURLException("URL exceeds maximum permitted length of 2048 characters.")

        try:
            parsed = urlparse(clean_url)
        except Exception as exc:
            raise InvalidURLException(f"Malformed URL structure: {exc}")

        if parsed.scheme.lower() not in ("http", "https"):
            raise InvalidURLException(
                f"Unsupported URL scheme '{parsed.scheme}'. Only 'http' and 'https' are supported."
            )

        hostname = parsed.hostname
        if not hostname:
            raise InvalidURLException("The URL does not contain a valid hostname or network location.")

        return clean_url, hostname.lower()

    def analyze(self, url: str) -> URLAnalysisResponse:
        """
        Executes all heuristic checks on the provided URL and returns a detailed URLAnalysisResponse.
        """
        clean_url, hostname = self.validate_url(url)
        parsed = urlparse(clean_url)
        path = unquote(parsed.path.lower())
        query = unquote(parsed.query.lower())
        full_text = f"{hostname}{path}?{query}"

        indicators: List[IndicatorItem] = []

        # 1. Check for raw IP address as host
        is_ip_host = False
        try:
            ipaddress.ip_address(hostname)
            is_ip_host = True
            indicators.append(
                IndicatorItem(
                    feature="ip_address_host",
                    impact=0.35,
                    description="Host uses a raw IP address instead of a registered domain name.",
                )
            )
        except ValueError:
            pass

        # 2. Check for Brand Impersonation on untrusted host
        for brand, official_domain in TARGET_BRANDS.items():
            if brand in full_text:
                # If host does not match the official domain or its valid subdomains
                is_official = hostname == official_domain or hostname.endswith(f".{official_domain}")
                if not is_official:
                    indicators.append(
                        IndicatorItem(
                            feature="brand_impersonation",
                            impact=0.30,
                            description=f"Target brand keyword ('{brand}') found on an untrusted host ({hostname}).",
                        )
                    )
                    break

        # 3. Check for Suspicious Credential Keywords
        detected_keywords = [kw for kw in SUSPICIOUS_KEYWORDS if kw in path or kw in query]
        if len(detected_keywords) >= 3:
            indicators.append(
                IndicatorItem(
                    feature="high_suspicious_token_count",
                    impact=0.25,
                    description=f"High frequency of credential/security tokens found: {', '.join(detected_keywords[:4])}.",
                )
            )
        elif len(detected_keywords) >= 1:
            indicators.append(
                IndicatorItem(
                    feature="suspicious_token",
                    impact=0.15,
                    description=f"Contains credential harvesting keyword: '{detected_keywords[0]}'.",
                )
            )

        # 4. Check for High-Risk / Abused TLDs
        matched_tld = next((tld for tld in SUSPICIOUS_TLDS if hostname.endswith(tld)), None)
        if matched_tld:
            indicators.append(
                IndicatorItem(
                    feature="suspicious_tld",
                    impact=0.20,
                    description=f"Domain uses a top-level domain frequently abused in phishing attacks ('{matched_tld}').",
                )
            )

        # 5. Check Subdomain Depth (e.g. login.verify.update.domain.com)
        subdomain_parts = hostname.split(".")
        if len(subdomain_parts) > 4:
            indicators.append(
                IndicatorItem(
                    feature="deep_subdomain_structure",
                    impact=0.15,
                    description="Excessive subdomain levels (> 3 subdomains) used to obfuscate the root domain.",
                )
            )

        # 6. Check for '@' symbol in URL authority
        if "@" in parsed.netloc:
            indicators.append(
                IndicatorItem(
                    feature="userinfo_at_symbol",
                    impact=0.25,
                    description="URL contains '@' symbol in authority, which can mislead users about destination.",
                )
            )

        # 7. Check for IDN Homograph / Punycode (xn--)
        if "xn--" in hostname:
            indicators.append(
                IndicatorItem(
                    feature="punycode_homograph",
                    impact=0.25,
                    description="Punycode encoding ('xn--') detected in domain name; possible homoglyph attack.",
                )
            )

        # 8. Check for multiple hyphens in hostname (e.g., paypal-account-security-update.com)
        if hostname.count("-") >= 2:
            indicators.append(
                IndicatorItem(
                    feature="excessive_domain_hyphens",
                    impact=0.15,
                    description="Domain contains multiple hyphens, a common pattern in typosquatting and brand spoofing.",
                )
            )

        # 9. Excessive total URL length
        if len(clean_url) > 75:
            indicators.append(
                IndicatorItem(
                    feature="excessive_url_length",
                    impact=0.10,
                    description=f"Abnormally long URL ({len(clean_url)} chars) commonly used to hide destination in address bars.",
                )
            )

        # 10. Plain unencrypted HTTP for sensitive/suspicious destinations
        if parsed.scheme.lower() == "http" and (is_ip_host or detected_keywords):
            indicators.append(
                IndicatorItem(
                    feature="insecure_http_credentials",
                    impact=0.10,
                    description="Sensitive action or IP host accessed over unencrypted plain HTTP.",
                )
            )

        # Compute Composite Risk Score
        raw_score = sum(ind.impact for ind in indicators)
        risk_score = round(min(1.0, max(0.0, raw_score)), 2)

        # Determine Risk Level and Classification
        if risk_score >= 0.70:
            risk_level = "High"
            is_phishing = True
            confidence = round(min(0.95, 0.70 + (len(indicators) * 0.05)), 2)
        elif risk_score >= 0.30:
            risk_level = "Medium"
            is_phishing = False
            confidence = 0.70
        else:
            risk_level = "Low"
            is_phishing = False
            confidence = round(max(0.85, 0.95 - (len(indicators) * 0.05)), 2)

        # Sort indicators by impact descending
        indicators.sort(key=lambda x: x.impact, reverse=True)

        return URLAnalysisResponse(
            url=clean_url,
            risk_score=risk_score,
            risk_level=risk_level,
            is_phishing=is_phishing,
            confidence=confidence,
            is_mock=False,
            top_indicators=indicators,
            evaluated_at=datetime.now(timezone.utc).isoformat(),
        )


# Export a singleton instance for dependency injection
heuristic_service = HeuristicAnalyzer()
