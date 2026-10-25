/**
 * ClickShield Content Script (Manifest V3)
 * 
 * Injected into web pages to provide:
 * 1. Pre-click link safety verification and high-risk navigation interception.
 * 2. Post-click DOM threat analysis (insecure forms, brand spoofing, credential traps).
 * 3. Bounded dynamic SPA mutation monitoring with zero sensitive data access.
 */

(function () {
  "use strict";

  // Prevent double injection
  if (window.__clickshield_injected) return;
  window.__clickshield_injected = true;

  // Local ephemeral cache of evaluated link destinations on this page
  const linkVerdictCache = new Map();
  let hoverTimer = null;
  let dynamicAnalysisCount = 0;
  const MAX_DYNAMIC_ANALYSES = 3;
  let isAnalyzingDOM = false;

  // Recognized brands for impersonation detection
  const TARGET_BRANDS = [
    { name: "paypal", domain: "paypal.com" },
    { name: "apple", domain: "apple.com" },
    { name: "google", domain: "google.com" },
    { name: "microsoft", domain: "microsoft.com" },
    { name: "netflix", domain: "netflix.com" },
    { name: "amazon", domain: "amazon.com" },
    { name: "chase", domain: "chase.com" },
    { name: "wellsfargo", domain: "wellsfargo.com" },
    { name: "bank of america", domain: "bankofamerica.com" },
    { name: "binance", domain: "binance.com" },
    { name: "coinbase", domain: "coinbase.com" },
  ];

  const URGENCY_PATTERNS = [
    /account\s+suspended/i,
    /suspended\s+permanently/i,
    /unauthorized\s+activity/i,
    /unauthorized\s+transaction/i,
    /verify\s+your\s+identity/i,
    /action\s+required/i,
    /security\s+alert/i,
    /unusual\s+sign-in/i,
  ];

  /**
   * Helper to safely extract a valid HTTP/HTTPS URL from an anchor element.
   * @param {HTMLAnchorElement} anchor
   * @returns {string|null}
   */
  function getValidDestination(anchor) {
    if (!anchor || !anchor.href) return null;
    const rawHref = anchor.getAttribute("href");
    if (!rawHref) return null;

    const trimmed = rawHref.trim();
    if (
      trimmed.startsWith("#") ||
      trimmed.startsWith("javascript:") ||
      trimmed.startsWith("mailto:") ||
      trimmed.startsWith("tel:") ||
      trimmed.startsWith("data:")
    ) {
      return null;
    }

    try {
      const parsed = new URL(anchor.href, window.location.href);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.href;
      }
    } catch {
      return null;
    }
    return null;
  }

  // =========================================================================
  // 1. PRE-CLICK LINK PROTECTION
  // =========================================================================

  /**
   * Hover pre-fetch: analyzes destination on hover with 150ms debounce
   * so clicks can resolve instantly without user-perceived delay.
   */
  document.addEventListener(
    "mouseover",
    (e) => {
      const anchor = e.target.closest("a[href]");
      if (!anchor) return;

      const targetUrl = getValidDestination(anchor);
      if (!targetUrl || linkVerdictCache.has(targetUrl)) return;

      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => {
        try {
          chrome.runtime.sendMessage(
            { action: "ANALYZE_URL", url: targetUrl, referrer: window.location.href },
            (response) => {
              if (chrome.runtime.lastError || !response) return;
              linkVerdictCache.set(targetUrl, response);
            }
          );
        } catch {
          // Extension context might be invalidated
        }
      }, 150);
    },
    true
  );

  /**
   * Click Interception (Capture Phase).
   * Intercepts navigation to evaluate risk before the browser commits.
   */
  document.addEventListener(
    "click",
    async (e) => {
      const anchor = e.target.closest("a[href]");
      if (!anchor) return;

      const targetUrl = getValidDestination(anchor);
      if (!targetUrl) return;

      // Check if known in cache
      const cached = linkVerdictCache.get(targetUrl);
      if (cached) {
        if (cached.is_phishing || cached.risk_level === "High") {
          e.preventDefault();
          e.stopPropagation();
          triggerWarningNavigation(targetUrl, cached, "pre_click_interception");
          return;
        }
        // Safe or medium, permit default click action
        return;
      }

      // If not yet in cache, attempt a fast synchronous-style check with strict timeout
      // Prevent navigation briefly while verifying
      e.preventDefault();
      e.stopPropagation();

      const toast = showVerifyingToast();

      try {
        const result = await Promise.race([
          new Promise((resolve) => {
            chrome.runtime.sendMessage(
              { action: "ANALYZE_URL", url: targetUrl, referrer: window.location.href },
              (response) => {
                if (chrome.runtime.lastError || !response) {
                  resolve(null);
                } else {
                  resolve(response);
                }
              }
            );
          }),
          new Promise((resolve) => setTimeout(() => resolve(null), 1200)), // 1.2s strict budget
        ]);

        removeVerifyingToast(toast);

        if (result) {
          linkVerdictCache.set(targetUrl, result);
          if (result.is_phishing || result.risk_level === "High") {
            triggerWarningNavigation(targetUrl, result, "pre_click_interception");
            return;
          }
        }

        // Safe, medium, or timeout: proceed with navigation (fail-open to avoid breaking browsing)
        proceedWithNavigation(anchor, targetUrl);
      } catch (err) {
        removeVerifyingToast(toast);
        proceedWithNavigation(anchor, targetUrl);
      }
    },
    true
  );

  /**
   * Redirects user to the ClickShield warning interstitial.
   */
  function triggerWarningNavigation(targetUrl, riskData, source) {
    chrome.runtime.sendMessage({
      action: "NAVIGATE_TO_WARNING",
      targetUrl,
      riskLevel: riskData.risk_level || "High",
      riskScore: riskData.risk_score || 0.85,
      reasons: riskData.top_indicators || riskData.reasons || ["Suspected phishing site"],
      source,
    });
  }

  /**
   * Resumes navigation if link was verified safe or timed out.
   */
  function proceedWithNavigation(anchor, targetUrl) {
    if (anchor.target === "_blank") {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    } else {
      window.location.href = targetUrl;
    }
  }

  /**
   * Visual micro-indicator during fast pre-click check.
   */
  function showVerifyingToast() {
    const toast = document.createElement("div");
    toast.id = "clickshield-verifying-toast";
    toast.textContent = "🛡️ ClickShield: Verifying destination...";
    Object.assign(toast.style, {
      position: "fixed",
      top: "16px",
      right: "16px",
      zIndex: "2147483647",
      backgroundColor: "#0f172a",
      color: "#c084fc",
      border: "1px solid #7c3aed",
      padding: "8px 14px",
      borderRadius: "8px",
      fontSize: "12px",
      fontWeight: "600",
      fontFamily: "system-ui, -apple-system, sans-serif",
      boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
      pointerEvents: "none",
      transition: "opacity 0.2s ease",
    });
    document.body.appendChild(toast);
    return toast;
  }

  function removeVerifyingToast(toast) {
    if (toast && toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }

  // =========================================================================
  // 2. POST-CLICK WEBPAGE ANALYSIS
  // =========================================================================

  /**
   * Performs bounded DOM telemetry extraction without touching sensitive inputs.
   * NEVER reads input.value, form values, cookies, or user keystrokes.
   */
  function extractPageTelemetry() {
    const currentUrl = window.location.href;
    const hostname = window.location.hostname.toLowerCase();
    const isHttps = window.location.protocol === "https:";
    const pageTitle = document.title || "";

    // 1. Password input fields (presence only)
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    const hasPasswordField = passwordInputs.length > 0;

    // 2. Credit card input fields (presence only via attribute matching)
    const creditCardSelectors = [
      'input[name*="card" i]',
      'input[name*="cc-" i]',
      'input[autocomplete*="cc-" i]',
      'input[id*="creditcard" i]',
      'input[id*="cardnumber" i]',
      'input[name*="cvv" i]',
      'input[id*="cvv" i]',
    ];
    const hasCreditCardField = !!document.querySelector(creditCardSelectors.join(","));

    // 3. Inspect Form Action URLs (detect cross-domain credential harvesting)
    let formActionUrl = null;
    const forms = document.querySelectorAll("form");
    for (const form of forms) {
      const hasCredInput = form.querySelector('input[type="password"], input[name*="card" i]');
      const rawAction = form.getAttribute("action");

      if (rawAction) {
        try {
          const resolvedAction = new URL(rawAction, window.location.href);
          // If action points to a different domain, record it for inspection
          if (resolvedAction.hostname.toLowerCase() !== hostname) {
            formActionUrl = resolvedAction.href;
            if (hasCredInput) break; // Priority finding
          } else if (!isHttps && resolvedAction.protocol === "http:") {
            formActionUrl = resolvedAction.href;
          }
        } catch {
          // Unparseable action
        }
      }
    }

    // 4. Hidden iframes (often used in clickjacking or credential sniffing)
    let hasHiddenIframes = false;
    const iframes = document.querySelectorAll("iframe");
    for (const iframe of iframes) {
      const style = window.getComputedStyle(iframe);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.opacity === "0" ||
        iframe.width === "0" ||
        iframe.height === "0" ||
        (iframe.offsetWidth === 0 && iframe.offsetHeight === 0)
      ) {
        hasHiddenIframes = true;
        break;
      }
    }

    // 5. External links ratio
    const links = document.querySelectorAll("a[href]");
    let externalCount = 0;
    let validCount = 0;
    for (const link of links) {
      try {
        const parsed = new URL(link.href, window.location.href);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
          validCount++;
          if (parsed.hostname.toLowerCase() !== hostname) {
            externalCount++;
          }
        }
      } catch {
        // Skip malformed link
      }
    }
    const externalLinksRatio = validCount > 0 ? Math.round((externalCount / validCount) * 100) / 100 : 0.0;

    // 6. Brand impersonation detection in page text / title
    let brandClue = null;
    const fullHeadingText = Array.from(document.querySelectorAll("h1, h2, title"))
      .map((el) => el.textContent || "")
      .join(" ")
      .toLowerCase();

    for (const { name, domain } of TARGET_BRANDS) {
      if (fullHeadingText.includes(name)) {
        const isOfficial = hostname === domain || hostname.endsWith(`.${domain}`);
        if (!isOfficial) {
          brandClue = name;
          break;
        }
      }
    }

    // 7. Psychological urgency language detection
    let urgencyCount = 0;
    for (const pattern of URGENCY_PATTERNS) {
      if (pattern.test(fullHeadingText)) {
        urgencyCount++;
      }
    }

    return {
      url: currentUrl,
      page_title: pageTitle.slice(0, 150),
      has_password_field: hasPasswordField,
      has_credit_card_field: hasCreditCardField,
      form_action_url: formActionUrl,
      is_https: isHttps,
      external_links_ratio: externalLinksRatio,
      has_hidden_iframes: hasHiddenIframes,
      brand_impersonation_clue: brandClue,
      urgency_phrases_count: urgencyCount,
      client_timestamp: new Date().toISOString(),
    };
  }

  /**
   * Executes post-click analysis and acts on high-risk detections.
   */
  async function runPostClickAnalysis() {
    if (isAnalyzingDOM) return;
    isAnalyzingDOM = true;

    try {
      const telemetry = extractPageTelemetry();

      chrome.runtime.sendMessage(
        { action: "ANALYZE_CONTENT", telemetry },
        (response) => {
          isAnalyzingDOM = false;
          if (chrome.runtime.lastError || !response) return;

          if (response.recommended_action === "BLOCK" || response.is_phishing || response.risk_level === "High") {
            console.warn("[ClickShield] Post-click DOM analysis detected HIGH-RISK threat on page:", response);
            // Redirect to interstitial warning page to unload potentially malicious scripts
            triggerWarningNavigation(
              window.location.href,
              {
                risk_level: response.risk_level || "High",
                risk_score: response.risk_score || 0.90,
                top_indicators: response.reasons || ["Critical DOM credential risk detected"],
              },
              "post_click_dom"
            );
          }
        }
      );
    } catch (err) {
      isAnalyzingDOM = false;
      console.debug("[ClickShield] Post-click analysis error:", err.message);
    }
  }

  // =========================================================================
  // 3. BOUNDED DYNAMIC SPA MUTATION OBSERVER
  // =========================================================================

  let mutationDebounceTimer = null;
  const observer = new MutationObserver((mutations) => {
    if (dynamicAnalysisCount >= MAX_DYNAMIC_ANALYSES) {
      observer.disconnect();
      return;
    }

    // Only trigger if interesting elements (forms, inputs, iframes) were added
    let relevantChange = false;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) { // Element node
          const tag = node.tagName.toLowerCase();
          if (tag === "form" || tag === "input" || tag === "iframe" || node.querySelector("form, input, iframe")) {
            relevantChange = true;
            break;
          }
        }
      }
      if (relevantChange) break;
    }

    if (!relevantChange) return;

    clearTimeout(mutationDebounceTimer);
    mutationDebounceTimer = setTimeout(() => {
      dynamicAnalysisCount++;
      runPostClickAnalysis();
    }, 500);
  });

  // Start analysis after document reaches interactive or complete
  if (document.readyState === "complete" || document.readyState === "interactive") {
    runPostClickAnalysis();
  } else {
    document.addEventListener("DOMContentLoaded", runPostClickAnalysis);
  }

  // Observe future mutations safely
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      }
    });
  }
})();
