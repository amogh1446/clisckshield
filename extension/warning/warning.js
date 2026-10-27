/**
 * ClickShield Warning Interstitial Controller
 * 
 * Safely parses and renders untrusted URL parameters using textContent only,
 * presents risk explanations, and manages return-to-safety vs bypass actions.
 */

document.addEventListener("DOMContentLoaded", () => {
  const targetUrlEl = document.getElementById("target-url");
  const riskPill = document.getElementById("risk-pill");
  const sourceBadge = document.getElementById("source-badge");
  const reasonsList = document.getElementById("reasons-list");
  const safetyBtn = document.getElementById("safety-btn");
  const advancedToggleBtn = document.getElementById("advanced-toggle-btn");
  const advancedContent = document.getElementById("advanced-content");
  const advancedCaret = document.getElementById("advanced-caret");
  const proceedBtn = document.getElementById("proceed-btn");

  // Read URL query parameters safely
  const urlParams = new URLSearchParams(window.location.search);
  const rawTarget = urlParams.get("target") || "";
  const rawRisk = urlParams.get("risk") || "High";
  const rawSource = urlParams.get("source") || "pre_click";
  const rawReasons = urlParams.get("reasons") || "";

  // Validate target destination
  let validatedTarget = null;
  try {
    const parsed = new URL(rawTarget);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      validatedTarget = parsed.href;
    }
  } catch {
    validatedTarget = null;
  }

  // Safe DOM text assignments (NEVER innerHTML)
  if (validatedTarget) {
    targetUrlEl.textContent = validatedTarget;
  } else {
    targetUrlEl.textContent = "Unspecified or invalid destination URL";
    targetUrlEl.style.color = "#94a3b8";
    if (proceedBtn) proceedBtn.disabled = true;
  }

  // Risk Pill
  riskPill.textContent = rawRisk.toUpperCase().includes("HIGH") ? "High Risk" : "Suspicious";
  if (rawRisk.toLowerCase() === "medium") {
    riskPill.className = "risk-pill pill-medium";
  } else {
    riskPill.className = "risk-pill pill-danger";
  }

  // Source attribution
  if (rawSource === "post_click_dom") {
    sourceBadge.textContent = "Post-Click Webpage Analysis";
  } else if (rawSource === "pre_click_interception") {
    sourceBadge.textContent = "Pre-Click Link Interception";
  } else if (rawSource === "pre_navigation") {
    sourceBadge.textContent = "Address Bar Navigation Guard";
  } else {
    sourceBadge.textContent = "Real-Time Heuristic Guard";
  }

  // Populate detection reasons
  while (reasonsList.firstChild) {
    reasonsList.removeChild(reasonsList.firstChild);
  }

  let parsedReasons = [];
  if (rawReasons) {
    try {
      const decoded = JSON.parse(rawReasons);
      if (Array.isArray(decoded)) {
        parsedReasons = decoded;
      }
    } catch {
      parsedReasons = [rawReasons];
    }
  }

  if (parsedReasons.length === 0) {
    parsedReasons = [
      "Destination flagged for high probability of phishing, credential theft, or domain spoofing.",
    ];
  }

  for (const reason of parsedReasons) {
    const li = document.createElement("li");
    li.textContent = typeof reason === "string" ? reason : reason.description || reason.feature || "Suspicious anomaly detected";
    reasonsList.appendChild(li);
  }

  // =========================================================================
  // Actions
  // =========================================================================

  // Return to safety
  safetyBtn.addEventListener("click", () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Safe fallback if opened directly in a fresh tab
      window.location.href = "https://www.google.com";
    }
  });

  // Advanced accordion toggle
  advancedToggleBtn.addEventListener("click", () => {
    const isVisible = advancedContent.style.display !== "none";
    advancedContent.style.display = isVisible ? "none" : "flex";
    advancedCaret.style.transform = isVisible ? "rotate(0deg)" : "rotate(180deg)";
  });

  // Proceed anyway action (explicit confirmation + session bypass recording)
  proceedBtn.addEventListener("click", () => {
    if (!validatedTarget) return;

    const confirmed = window.confirm(
      "WARNING: Proceeding may expose your passwords, bank details, or personal data to malicious actors.\n\nDo you want to continue to this unverified site?"
    );

    if (confirmed) {
      // Record session bypass in service worker to avoid infinite interception loop
      try {
        chrome.runtime.sendMessage(
          { action: "RECORD_BYPASS", url: validatedTarget },
          () => {
            window.location.href = validatedTarget;
          }
        );
      } catch {
        window.location.href = validatedTarget;
      }
    }
  });
});
