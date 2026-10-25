/**
 * ClickShield Popup Controller
 * 
 * Manages user interactions, tab inspection, threat meter visualization,
 * manual scanning, and backend configuration settings.
 */

document.addEventListener("DOMContentLoaded", async () => {
  // DOM Elements
  const protectionToggle = document.getElementById("protection-toggle");
  const statusBadge = document.getElementById("protection-status-badge");
  const currentUrlEl = document.getElementById("current-url");
  const protocolBadge = document.getElementById("tab-protocol-badge");
  const riskCard = document.getElementById("risk-card");
  const internalCard = document.getElementById("internal-page-card");
  const riskLevelTag = document.getElementById("risk-level-tag");
  const riskScoreText = document.getElementById("risk-score-text");
  const riskMeterFill = document.getElementById("risk-meter-fill");
  const engineSourceTag = document.getElementById("engine-source-tag");
  const threatIndicatorsList = document.getElementById("threat-indicators-list");
  const scanBtn = document.getElementById("scan-now-btn");
  const scanBtnText = document.getElementById("scan-btn-text");
  const scanBtnIcon = document.getElementById("scan-btn-icon");
  const backendDot = document.getElementById("backend-dot");
  const backendStatusText = document.getElementById("backend-status-text");
  const toggleSettingsBtn = document.getElementById("toggle-settings-btn");
  const settingsPanel = document.getElementById("settings-panel");
  const apiUrlInput = document.getElementById("api-url-input");
  const mockToggle = document.getElementById("mock-toggle");
  const saveSettingsBtn = document.getElementById("save-settings-btn");
  const statScans = document.getElementById("stat-scans");
  const statThreats = document.getElementById("stat-threats");

  let activeTab = null;

  /**
   * Safely formats and truncates URL for clean display without breaking origin.
   */
  function shortenUrl(url, maxLen = 42) {
    if (!url) return "Unknown URL";
    try {
      const u = new URL(url);
      const origin = `${u.protocol}//${u.hostname}`;
      const pathAndQuery = u.pathname + u.search;
      if (url.length <= maxLen) return url;
      if (origin.length >= maxLen - 8) {
        return `${origin.slice(0, maxLen - 3)}...`;
      }
      const remain = maxLen - origin.length - 3;
      return `${origin}${pathAndQuery.slice(0, Math.floor(remain / 2))}...${pathAndQuery.slice(-Math.ceil(remain / 2))}`;
    } catch {
      return url.length > maxLen ? `${url.slice(0, maxLen - 3)}...` : url;
    }
  }

  /**
   * Updates threat indicators list safely with textContent.
   */
  function renderIndicators(indicators) {
    while (threatIndicatorsList.firstChild) {
      threatIndicatorsList.removeChild(threatIndicatorsList.firstChild);
    }

    if (!indicators || indicators.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No phishing or deception indicators detected.";
      li.style.color = "#34d399";
      threatIndicatorsList.appendChild(li);
      return;
    }

    for (const ind of indicators) {
      const li = document.createElement("li");
      const text = typeof ind === "string" ? ind : ind.description || ind.feature;
      li.textContent = text;
      threatIndicatorsList.appendChild(li);
    }
  }

  /**
   * Updates risk visualization based on assessment result.
   */
  function updateRiskDisplay(result) {
    if (!result) return;

    const score = typeof result.risk_score === "number" ? result.risk_score : 0.0;
    const level = (result.risk_level || "Unknown").toLowerCase();
    const percent = Math.round(score * 100);

    riskScoreText.textContent = `${percent}%`;
    riskMeterFill.style.width = `${percent}%`;

    // Clear tag and meter classes
    riskLevelTag.className = "risk-tag";
    riskMeterFill.className = "meter-bar-fill";

    if (level === "high" || result.is_phishing) {
      riskLevelTag.textContent = "High Risk";
      riskLevelTag.classList.add("risk-high");
      riskMeterFill.classList.add("meter-high");
    } else if (level === "medium") {
      riskLevelTag.textContent = "Suspicious";
      riskLevelTag.classList.add("risk-medium");
      riskMeterFill.classList.add("meter-medium");
    } else if (level === "low") {
      riskLevelTag.textContent = "Safe";
      riskLevelTag.classList.add("risk-low");
      riskMeterFill.classList.add("meter-low");
    } else {
      riskLevelTag.textContent = "Unknown";
      riskLevelTag.classList.add("risk-unknown");
      riskMeterFill.classList.add("meter-unknown");
    }

    // Engine attribution
    if (result.is_mock || result.adapter_mode === "forced_mock" || result.adapter_mode === "fallback_heuristic") {
      engineSourceTag.textContent = "Local Heuristic Engine (Mock)";
      engineSourceTag.style.color = "#c084fc";
    } else {
      engineSourceTag.textContent = "FastAPI Backend Service";
      engineSourceTag.style.color = "#34d399";
    }

    const indicators = result.top_indicators || result.reasons || [];
    renderIndicators(indicators);
  }

  /**
   * Loads extension settings and statistics.
   */
  async function loadSettingsAndStats() {
    chrome.runtime.sendMessage({ action: "GET_SETTINGS" }, (res) => {
      if (chrome.runtime.lastError || !res) return;

      protectionToggle.checked = res.protectionEnabled !== false;
      updateStatusBadge(res.protectionEnabled !== false);

      apiUrlInput.value = res.apiBaseUrl || "http://127.0.0.1:8000/api/v1";
      mockToggle.checked = !!res.forceMock;

      if (res.stats) {
        statScans.textContent = res.stats.scansCount || 0;
        statThreats.textContent = res.threatsBlocked || res.stats.threatsBlocked || 0;
      }
    });
  }

  /**
   * Checks backend health and updates connection status bar.
   */
  async function verifyBackendHealth() {
    backendDot.className = "dot dot-amber";
    backendStatusText.textContent = "Checking FastAPI backend...";

    chrome.runtime.sendMessage({ action: "PING" }, (res) => {
      if (chrome.runtime.lastError || !res) {
        backendDot.className = "dot dot-red";
        backendStatusText.textContent = "Service worker unavailable";
        return;
      }

      const health = res.health;
      if (health && health.online) {
        backendDot.className = "dot dot-green";
        backendStatusText.textContent = `Backend Online (v${health.version || "1.0.0"})`;
      } else if (res.settings && res.settings.forceMock) {
        backendDot.className = "dot dot-amber";
        backendStatusText.textContent = "Mock Adapter Mode (Forced)";
      } else {
        backendDot.className = "dot dot-amber";
        backendStatusText.textContent = "Backend Offline — Using Local Heuristics";
      }
    });
  }

  function updateStatusBadge(enabled) {
    if (enabled) {
      statusBadge.textContent = "Active";
      statusBadge.className = "status-pill status-active";
    } else {
      statusBadge.textContent = "Paused";
      statusBadge.className = "status-pill status-paused";
    }
  }

  /**
   * Analyzes the active tab's URL.
   */
  function inspectActiveTab(forceRefresh = false) {
    if (!activeTab || !activeTab.url) return;

    const url = activeTab.url;
    currentUrlEl.textContent = shortenUrl(url);
    currentUrlEl.title = url;

    // Check if internal browser page
    if (
      url.startsWith("chrome://") ||
      url.startsWith("edge://") ||
      url.startsWith("about:") ||
      url.startsWith("chrome-extension://") ||
      url.startsWith("devtools://")
    ) {
      riskCard.style.display = "none";
      internalCard.style.display = "flex";
      protocolBadge.textContent = "INTERNAL";
      protocolBadge.className = "protocol-badge";
      scanBtn.disabled = true;
      scanBtn.style.opacity = "0.5";
      return;
    }

    riskCard.style.display = "flex";
    internalCard.style.display = "none";
    scanBtn.disabled = false;
    scanBtn.style.opacity = "1";

    const isHttps = url.startsWith("https://");
    protocolBadge.textContent = isHttps ? "HTTPS" : "HTTP";
    protocolBadge.className = isHttps ? "protocol-badge" : "protocol-badge protocol-http";

    // Set scanning state
    scanBtn.disabled = true;
    scanBtnIcon.textContent = "⏳";
    scanBtnText.textContent = "Analyzing...";

    chrome.runtime.sendMessage(
      { action: "ANALYZE_URL", url, forceRefresh },
      (response) => {
        scanBtn.disabled = false;
        scanBtnIcon.textContent = "⚡";
        scanBtnText.textContent = "Re-Scan Page";

        if (chrome.runtime.lastError || !response) {
          updateRiskDisplay({
            risk_score: 0.0,
            risk_level: "Unknown",
            top_indicators: ["Failed to communicate with ClickShield service worker."],
          });
          return;
        }

        updateRiskDisplay(response);
        loadSettingsAndStats();
      }
    );
  }

  // =========================================================================
  // Event Listeners
  // =========================================================================

  // Master Protection Toggle
  protectionToggle.addEventListener("change", () => {
    const isEnabled = protectionToggle.checked;
    updateStatusBadge(isEnabled);
    chrome.runtime.sendMessage({
      action: "SAVE_SETTINGS",
      protectionEnabled: isEnabled,
    });
  });

  // Re-scan Button
  scanBtn.addEventListener("click", () => {
    inspectActiveTab(true);
  });

  // Settings Panel Toggle
  toggleSettingsBtn.addEventListener("click", () => {
    const isHidden = settingsPanel.style.display === "none";
    settingsPanel.style.display = isHidden ? "flex" : "none";
  });

  // Save Settings Button
  saveSettingsBtn.addEventListener("click", () => {
    const newUrl = apiUrlInput.value.trim();
    const isMock = mockToggle.checked;

    saveSettingsBtn.textContent = "Saving...";

    chrome.runtime.sendMessage(
      {
        action: "SAVE_SETTINGS",
        apiBaseUrl: newUrl,
        forceMock: isMock,
      },
      () => {
        saveSettingsBtn.textContent = "Saved!";
        setTimeout(() => {
          saveSettingsBtn.textContent = "Save & Verify";
        }, 1500);
        verifyBackendHealth();
        inspectActiveTab(true);
      }
    );
  });

  // Initialize
  await loadSettingsAndStats();
  await verifyBackendHealth();

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTab = tab;
    inspectActiveTab(false);
  } catch (err) {
    currentUrlEl.textContent = "Unable to inspect active tab";
    console.error("Tab query failed:", err);
  }
});
