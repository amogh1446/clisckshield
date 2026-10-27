/**
 * ClickShield Detection Adapter & Heuristic Engine
 *
 * Provides:
 * 1. RFC-compliant URL validation & normalization
 * 2. Static lexical and domain heuristic analyzer (mirrors backend heuristic engine)
 * 3. Post-click DOM content heuristic analyzer
 * 4. Resilient API client with timeout, error recovery, and graceful local mock fallback
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ClickShieldDetection = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // Target brand keywords frequently abused in phishing attacks
  const TARGET_BRANDS = {
    paypal: "paypal.com",
    apple: "apple.com",
    google: "google.com",
    microsoft: "microsoft.com",
    netflix: "netflix.com",
    amazon: "amazon.com",
    facebook: "facebook.com",
    instagram: "instagram.com",
    chase: "chase.com",
    wellsfargo: "wellsfargo.com",
    bankofamerica: "bankofamerica.com",
    binance: "binance.com",
    coinbase: "coinbase.com",
  };

  // Credential harvesting and deception keywords
  const SUSPICIOUS_KEYWORDS = [
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
  ];

  // Free or high-abuse top-level domains commonly used in zero-day phishing
  const SUSPICIOUS_TLDS = [
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
  ];

  // Common psychological urgency phrases in phishing pages
  const URGENCY_PHRASES = [
    "account suspended",
    "suspended permanently",
    "unauthorized activity",
    "unauthorized transaction",
    "confirm your identity",
    "verify immediately",
    "action required within 24 hours",
    "limited account access",
    "security alert",
    "unusual sign-in activity",
    "financial hold",
    "update billing information",
  ];

  /**
   * Validates if a string is a valid HTTP/HTTPS URL.
   * Rejects malformed strings, internal protocols (chrome://, javascript:, mailto:, file:), etc.
   * @param {string} urlString
   * @returns {{ valid: boolean, parsed?: URL, error?: string }}
   */
  function validateUrl(urlString) {
    if (!urlString || typeof urlString !== "string" || !urlString.trim()) {
      return { valid: false, error: "URL must not be empty." };
    }

    const clean = urlString.trim();
    if (clean.length > 2048) {
      return { valid: false, error: "URL exceeds maximum permitted length of 2048 characters." };
    }

    try {
      const parsed = new URL(clean);
      const scheme = parsed.protocol.toLowerCase().replace(":", "");
      if (scheme !== "http" && scheme !== "https") {
        return {
          valid: false,
          error: `Unsupported URL scheme '${scheme}:'. Only 'http:' and 'https:' are supported.`,
        };
      }

      if (!parsed.hostname || parsed.hostname.trim() === "") {
        return { valid: false, error: "The URL does not contain a valid hostname or network location." };
      }

      return { valid: true, parsed };
    } catch (e) {
      return { valid: false, error: `Malformed URL structure: ${e.message}` };
    }
  }

  /**
   * Normalizes URL for consistent cache indexing and deduplication.
   * @param {string} urlString
   * @returns {string}
   */
  function normalizeUrl(urlString) {
    const val = validateUrl(urlString);
    if (!val.valid || !val.parsed) return urlString;
    const p = val.parsed;
    let norm = `${p.protocol}//${p.hostname.toLowerCase()}`;
    if (p.port && p.port !== "80" && p.port !== "443") {
      norm += `:${p.port}`;
    }
    norm += p.pathname.replace(/\/+$/, "") || "/";
    if (p.search) {
      norm += p.search;
    }
    return norm;
  }

  /**
   * Checks if a string is an IPv4 or IPv6 address.
   * @param {string} hostname
   * @returns {boolean}
   */
  function isIpAddress(hostname) {
    if (!hostname) return false;
    const cleanHost = hostname.replace(/^\[|\]$/g, "");
    // IPv4 pattern
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(cleanHost)) {
      const parts = cleanHost.split(".").map(Number);
      return parts.every((p) => p >= 0 && p <= 255);
    }
    // IPv6 simple check (contains at least two colons)
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    return ipv6Regex.test(cleanHost);
  }

  /**
   * Static Heuristic Risk Analysis Engine for URLs.
   * Mirrors the backend HeuristicAnalyzer rules exactly.
   */
  const HeuristicEngine = {
    analyze(urlString) {
      const val = validateUrl(urlString);
      if (!val.valid) {
        throw new Error(val.error || "Invalid URL");
      }

      const parsed = val.parsed;
      const cleanUrl = parsed.href;
      const hostname = parsed.hostname.toLowerCase();
      let path = "";
      let query = "";
      try {
        path = decodeURIComponent(parsed.pathname.toLowerCase());
        query = decodeURIComponent(parsed.search.toLowerCase());
      } catch {
        path = parsed.pathname.toLowerCase();
        query = parsed.search.toLowerCase();
      }
      const fullText = `${hostname}${path}?${query}`;

      const indicators = [];

      // 1. Raw IP address host
      const isIp = isIpAddress(hostname);
      if (isIp) {
        indicators.push({
          feature: "ip_address_host",
          impact: 0.35,
          description: "Host uses a raw IP address instead of a registered domain name.",
        });
      }

      // 2. Brand impersonation on untrusted host
      for (const [brand, officialDomain] of Object.entries(TARGET_BRANDS)) {
        if (fullText.includes(brand)) {
          const isOfficial = hostname === officialDomain || hostname.endsWith(`.${officialDomain}`);
          if (!isOfficial) {
            indicators.push({
              feature: "brand_impersonation",
              impact: 0.30,
              description: `Target brand keyword ('${brand}') found on an untrusted host (${hostname}).`,
            });
            break;
          }
        }
      }

      // 3. Suspicious credential keywords
      const detectedKeywords = SUSPICIOUS_KEYWORDS.filter(
        (kw) => path.includes(kw) || query.includes(kw)
      );
      if (detectedKeywords.length >= 3) {
        indicators.push({
          feature: "high_suspicious_token_count",
          impact: 0.25,
          description: `High frequency of credential/security tokens found: ${detectedKeywords.slice(0, 4).join(", ")}.`,
        });
      } else if (detectedKeywords.length >= 1) {
        indicators.push({
          feature: "suspicious_token",
          impact: 0.15,
          description: `Contains credential harvesting keyword: '${detectedKeywords[0]}'.`,
        });
      }

      // 4. High-risk abused TLD
      const matchedTld = SUSPICIOUS_TLDS.find((tld) => hostname.endsWith(tld));
      if (matchedTld) {
        indicators.push({
          feature: "suspicious_tld",
          impact: 0.20,
          description: `Domain uses a top-level domain frequently abused in phishing attacks ('${matchedTld}').`,
        });
      }

      // 5. Subdomain depth (> 4 labels)
      const subdomainParts = hostname.split(".");
      if (subdomainParts.length > 4) {
        indicators.push({
          feature: "deep_subdomain_structure",
          impact: 0.15,
          description: "Excessive subdomain levels (> 3 subdomains) used to obfuscate root domain.",
        });
      }

      // 6. Userinfo '@' symbol
      if (parsed.username || parsed.password) {
        indicators.push({
          feature: "userinfo_at_symbol",
          impact: 0.25,
          description: "URL contains '@' symbol in authority, which can mislead users about true destination.",
        });
      }

      // 7. Punycode IDN homograph ('xn--')
      if (hostname.includes("xn--")) {
        indicators.push({
          feature: "punycode_homograph",
          impact: 0.25,
          description: "Punycode encoding ('xn--') detected in domain name; possible homoglyph attack.",
        });
      }

      // 8. Multiple hyphens in hostname
      const hyphenCount = (hostname.match(/-/g) || []).length;
      if (hyphenCount >= 2) {
        indicators.push({
          feature: "excessive_domain_hyphens",
          impact: 0.15,
          description: "Domain contains multiple hyphens, a common pattern in typosquatting and brand spoofing.",
        });
      }

      // 9. Excessive total URL length
      if (cleanUrl.length > 75) {
        indicators.push({
          feature: "excessive_url_length",
          impact: 0.10,
          description: `Abnormally long URL (${cleanUrl.length} chars) commonly used to hide destination in address bars.`,
        });
      }

      // 10. Plain unencrypted HTTP for sensitive/suspicious destinations
      if (parsed.protocol === "http:" && (isIp || detectedKeywords.length > 0)) {
        indicators.push({
          feature: "insecure_http_credentials",
          impact: 0.10,
          description: "Sensitive action or IP host accessed over unencrypted plain HTTP.",
        });
      }

      // Compute Composite Risk Score
      const rawScore = indicators.reduce((sum, item) => sum + item.impact, 0);
      const riskScore = Math.round(Math.min(1.0, Math.max(0.0, rawScore)) * 100) / 100;

      let riskLevel = "Low";
      let isPhishing = false;
      let confidence = 0.85;

      if (riskScore >= 0.70) {
        riskLevel = "High";
        isPhishing = true;
        confidence = Math.round(Math.min(0.95, 0.70 + indicators.length * 0.05) * 100) / 100;
      } else if (riskScore >= 0.30) {
        riskLevel = "Medium";
        isPhishing = false;
        confidence = 0.70;
      } else {
        riskLevel = "Low";
        isPhishing = false;
        confidence = Math.round(Math.max(0.85, 0.95 - indicators.length * 0.05) * 100) / 100;
      }

      indicators.sort((a, b) => b.impact - a.impact);

      return {
        url: cleanUrl,
        risk_score: riskScore,
        risk_level: riskLevel,
        is_phishing: isPhishing,
        confidence,
        is_mock: true,
        top_indicators: indicators,
        evaluated_at: new Date().toISOString(),
        engine: "ClickShield-Local-Heuristics",
      };
    },
  };

  /**
   * Post-click DOM Content Heuristic Analysis Engine.
   * Evaluates telemetry gathered after a webpage loads.
   */
  const ContentHeuristicEngine = {
    analyze(telemetry) {
      const url = telemetry.url || "";
      const val = validateUrl(url);
      const parsed = val.valid ? val.parsed : null;
      const hostname = parsed ? parsed.hostname.toLowerCase() : "";

      const reasons = [];
      const indicators = [];

      // 1. Password input on plain HTTP
      if (telemetry.has_password_field && !telemetry.is_https) {
        reasons.push("Password input field submitted over unencrypted HTTP");
        indicators.push({
          feature: "insecure_password_form",
          impact: 0.40,
          description: "Credential input rendered over plain HTTP without TLS encryption.",
        });
      }

      // 2. Form action pointing to foreign/unrelated host
      if (telemetry.form_action_url && parsed) {
        try {
          const actionUrl = new URL(telemetry.form_action_url, parsed.origin);
          const actionHost = actionUrl.hostname.toLowerCase();
          const isSameDomain =
            actionHost === hostname ||
            hostname.endsWith(`.${actionHost}`) ||
            actionHost.endsWith(`.${hostname}`);

          // Common third-party authenticators might be legitimate, but mismatched random hosts are suspicious
          const knownAuthProviders = ["accounts.google.com", "login.microsoftonline.com", "appleid.apple.com"];
          const isKnownOAuth = knownAuthProviders.includes(actionHost);

          if (!isSameDomain && !isKnownOAuth && telemetry.has_password_field) {
            reasons.push(`Form action posts credentials to a mismatched foreign host (${actionHost})`);
            indicators.push({
              feature: "cross_origin_credential_post",
              impact: 0.40,
              description: `Password form submits credentials to an unrelated external domain: ${actionHost}.`,
            });
          }
        } catch {
          // Incomprehensible action URL
        }
      }

      // 3. Payment / Credit Card fields on untrusted host
      if (telemetry.has_credit_card_field) {
        if (!telemetry.is_https) {
          reasons.push("Payment card input field detected over insecure connection");
          indicators.push({
            feature: "insecure_credit_card_collection",
            impact: 0.45,
            description: "Credit card / financial details requested over insecure HTTP.",
          });
        } else {
          // If credit card field exists alongside brand impersonation or suspicious TLD
          indicators.push({
            feature: "credit_card_collection",
            impact: 0.25,
            description: "Credit card or sensitive payment details input field detected.",
          });
        }
      }

      // 4. Brand impersonation in page title or content
      if (telemetry.brand_impersonation_clue && parsed) {
        const brand = telemetry.brand_impersonation_clue.toLowerCase();
        const officialDomain = TARGET_BRANDS[brand];
        if (officialDomain) {
          const isOfficial = hostname === officialDomain || hostname.endsWith(`.${officialDomain}`);
          if (!isOfficial) {
            reasons.push(`Target brand '${brand}' detected in page title/content on untrusted domain (${hostname})`);
            indicators.push({
              feature: "content_brand_impersonation",
              impact: 0.35,
              description: `Page claims to represent '${brand}' but is hosted on '${hostname}'.`,
            });
          }
        }
      }

      // 5. Hidden iframes on sensitive page
      if (telemetry.has_hidden_iframes && (telemetry.has_password_field || telemetry.has_credit_card_field)) {
        reasons.push("Hidden iframes detected on credential-gathering page");
        indicators.push({
          feature: "hidden_credential_iframes",
          impact: 0.20,
          description: "Invisible iframes present alongside login or payment inputs (potential clickjacking).",
        });
      }

      // 6. High ratio of external links
      if (typeof telemetry.external_links_ratio === "number" && telemetry.external_links_ratio > 0.80) {
        reasons.push("Abnormally high ratio of external/unlinked references");
        indicators.push({
          feature: "high_external_links_ratio",
          impact: 0.15,
          description: `Page links point overwhelmingly (${Math.round(telemetry.external_links_ratio * 100)}%) to external hosts.`,
        });
      }

      // 7. Urgency phrases in content
      if (telemetry.urgency_phrases_count && telemetry.urgency_phrases_count >= 2) {
        reasons.push("Deceptive psychological urgency language detected (account suspension / immediate verification demands)");
        indicators.push({
          feature: "deceptive_urgency_phrases",
          impact: 0.15,
          description: "Multiple high-pressure security scare phrases identified in visible page text.",
        });
      }

      // Compute Composite Risk Score
      const rawScore = indicators.reduce((sum, item) => sum + item.impact, 0);
      const riskScore = Math.round(Math.min(1.0, Math.max(0.0, rawScore)) * 100) / 100;

      let riskLevel = "Low";
      let isPhishing = false;
      let recommendedAction = "ALLOW";

      if (riskScore >= 0.70) {
        riskLevel = "High";
        isPhishing = true;
        recommendedAction = "BLOCK";
      } else if (riskScore >= 0.35) {
        riskLevel = "Medium";
        isPhishing = false;
        recommendedAction = "WARN";
      } else {
        riskLevel = "Low";
        isPhishing = false;
        recommendedAction = "ALLOW";
      }

      if (reasons.length === 0) {
        reasons.push("No significant credential harvesting or DOM anomalies detected.");
      }

      indicators.sort((a, b) => b.impact - a.impact);

      return {
        url,
        risk_score: riskScore,
        risk_level: riskLevel,
        is_phishing: isPhishing,
        is_mock: true,
        reasons,
        top_indicators: indicators,
        recommended_action: recommendedAction,
        evaluated_at: new Date().toISOString(),
        engine: "ClickShield-Content-Heuristics",
      };
    },
  };

  /**
   * Detection Adapter.
   * Connects to FastAPI backend (/api/v1) and gracefully falls back to local heuristics
   * when offline, timeout, or unimplemented endpoints are encountered.
   */
  class DetectionAdapter {
    /**
     * @param {Object} options
     * @param {string} [options.apiBaseUrl] - Base URL (default: http://127.0.0.1:8000/api/v1)
     * @param {number} [options.timeoutMs] - Request timeout in milliseconds (default: 3000ms)
     * @param {boolean} [options.forceMock] - Force mock heuristic adapter without network calls
     */
    constructor(options = {}) {
      this.apiBaseUrl = (options.apiBaseUrl || "http://127.0.0.1:8000/api/v1").replace(/\/+$/, "");
      this.timeoutMs = options.timeoutMs || 3000;
      this.forceMock = !!options.forceMock;
      this.lastBackendStatus = {
        online: false,
        checkedAt: null,
        error: null,
      };
    }

    /**
     * Checks backend service health.
     * @returns {Promise<{ online: boolean, status?: string, version?: string, error?: string }>}
     */
    async checkHealth() {
      if (this.forceMock) {
        return {
          online: false,
          status: "mock_mode",
          version: "0.1.0-mock",
          note: "Offline Mock Adapter Active",
        };
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);

      try {
        const res = await fetch(`${this.apiBaseUrl}/health`, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (res.ok) {
          const data = await res.json();
          this.lastBackendStatus = {
            online: true,
            checkedAt: new Date().toISOString(),
            error: null,
          };
          return {
            online: true,
            status: data.status,
            version: data.version,
            model_loaded: data.model_loaded,
            environment: data.environment,
          };
        } else {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
      } catch (err) {
        clearTimeout(timer);
        this.lastBackendStatus = {
          online: false,
          checkedAt: new Date().toISOString(),
          error: err.name === "AbortError" ? "Backend health check timed out (2s)" : err.message,
        };
        return {
          online: false,
          error: this.lastBackendStatus.error,
        };
      }
    }

    /**
     * Analyzes URL pre-click.
     * Tries POST /api/v1/analyze/url. On failure, falls back to HeuristicEngine.
     * @param {string} url
     * @param {string} [referrer]
     * @returns {Promise<Object>}
     */
    async analyzeUrl(url, referrer = "") {
      const val = validateUrl(url);
      if (!val.valid) {
        return {
          url,
          risk_score: 0.0,
          risk_level: "Unknown",
          is_phishing: false,
          confidence: 0.0,
          is_mock: true,
          top_indicators: [
            {
              feature: "invalid_url_format",
              impact: 0.0,
              description: val.error || "Invalid URL scheme or format",
            },
          ],
          evaluated_at: new Date().toISOString(),
          error: val.error,
        };
      }

      if (this.forceMock) {
        const mockResult = HeuristicEngine.analyze(url);
        mockResult.is_mock = true;
        mockResult.adapter_mode = "forced_mock";
        return mockResult;
      }

      // Attempt live backend call
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const res = await fetch(`${this.apiBaseUrl}/analyze/url`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            url: val.parsed.href,
            referrer: referrer || null,
            client_timestamp: new Date().toISOString(),
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (res.ok) {
          const data = await res.json();
          // Ensure structure has required fields
          return {
            url: data.url || val.parsed.href,
            risk_score: typeof data.risk_score === "number" ? data.risk_score : 0.0,
            risk_level: data.risk_level || "Unknown",
            is_phishing: !!data.is_phishing,
            confidence: typeof data.confidence === "number" ? data.confidence : 0.85,
            is_mock: !!data.is_mock,
            top_indicators: Array.isArray(data.top_indicators) ? data.top_indicators : [],
            evaluated_at: data.evaluated_at || new Date().toISOString(),
            adapter_mode: "live_backend",
          };
        } else {
          // Backend returned non-200, fallback to local heuristics
          console.warn(`[ClickShield] Backend returned ${res.status}. Falling back to local heuristic analyzer.`);
          const fallback = HeuristicEngine.analyze(url);
          fallback.is_mock = true;
          fallback.adapter_mode = "fallback_heuristic";
          fallback.top_indicators.push({
            feature: "backend_unavailable_fallback",
            impact: 0.0,
            description: `Backend returned HTTP ${res.status}. Result generated by local ClickShield heuristics.`,
          });
          return fallback;
        }
      } catch (err) {
        clearTimeout(timer);
        const reason = err.name === "AbortError" ? "Backend request timed out" : err.message;
        console.warn(`[ClickShield] Backend unavailable (${reason}). Falling back to local heuristic analyzer.`);
        const fallback = HeuristicEngine.analyze(url);
        fallback.is_mock = true;
        fallback.adapter_mode = "fallback_heuristic";
        fallback.backend_error = reason;
        return fallback;
      }
    }

    /**
     * Analyzes DOM telemetry post-click.
     * Tries POST /api/v1/analyze/content. If endpoint missing/down, falls back to ContentHeuristicEngine.
     * @param {Object} telemetry
     * @returns {Promise<Object>}
     */
    async analyzeContent(telemetry) {
      if (this.forceMock) {
        const mockResult = ContentHeuristicEngine.analyze(telemetry);
        mockResult.is_mock = true;
        mockResult.adapter_mode = "forced_mock";
        return mockResult;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const res = await fetch(`${this.apiBaseUrl}/analyze/content`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            url: telemetry.url,
            page_title: telemetry.page_title,
            has_password_field: !!telemetry.has_password_field,
            has_credit_card_field: !!telemetry.has_credit_card_field,
            form_action_url: telemetry.form_action_url || null,
            is_https: !!telemetry.is_https,
            external_links_ratio: telemetry.external_links_ratio || 0.0,
            has_hidden_iframes: !!telemetry.has_hidden_iframes,
            client_timestamp: new Date().toISOString(),
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (res.ok) {
          const data = await res.json();
          return {
            url: data.url || telemetry.url,
            risk_score: typeof data.risk_score === "number" ? data.risk_score : 0.0,
            risk_level: data.risk_level || "Unknown",
            is_phishing: !!data.is_phishing,
            is_mock: !!data.is_mock,
            reasons: Array.isArray(data.reasons) ? data.reasons : [],
            top_indicators: Array.isArray(data.top_indicators) ? data.top_indicators : [],
            recommended_action: data.recommended_action || "ALLOW",
            evaluated_at: data.evaluated_at || new Date().toISOString(),
            adapter_mode: "live_backend",
          };
        } else {
          // Expected when Member 2 has not deployed /analyze/content yet
          const fallback = ContentHeuristicEngine.analyze(telemetry);
          fallback.is_mock = true;
          fallback.adapter_mode = "fallback_heuristic";
          return fallback;
        }
      } catch (err) {
        clearTimeout(timer);
        const fallback = ContentHeuristicEngine.analyze(telemetry);
        fallback.is_mock = true;
        fallback.adapter_mode = "fallback_heuristic";
        fallback.backend_error = err.name === "AbortError" ? "Request timed out" : err.message;
        return fallback;
      }
    }
  }

  return {
    TARGET_BRANDS,
    SUSPICIOUS_KEYWORDS,
    SUSPICIOUS_TLDS,
    URGENCY_PHRASES,
    validateUrl,
    normalizeUrl,
    isIpAddress,
    HeuristicEngine,
    ContentHeuristicEngine,
    DetectionAdapter,
  };
});
