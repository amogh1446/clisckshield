/**
 * ClickShield Background Service Worker (Manifest V3)
 * 
 * Coordinates URL and content risk analysis, manages cache and session bypasses,
 * evaluates navigation events, and maintains security badge state.
 */

// Load shared modules
importScripts("/core/detection-adapter.js", "/core/cache.js");

const { validateUrl, normalizeUrl, DetectionAdapter } = self.ClickShieldDetection;
const { UrlCache } = self.ClickShieldCache;

// Ephemeral runtime cache and adapter instance
const urlCache = new UrlCache({ ttlMs: 300000, maxEntries: 100 });
let currentAdapter = new DetectionAdapter();

/**
 * Updates extension action badge.
 * @param {number|null} tabId
 * @param {string} text
 * @param {string} color
 */
async function updateBadge(tabId, text, color) {
  try {
    const badgeDetails = tabId ? { text, tabId } : { text };
    await chrome.action.setBadgeText(badgeDetails);
    if (color) {
      const colorDetails = tabId ? { color, tabId } : { color };
      await chrome.action.setBadgeBackgroundColor(colorDetails);
    }
  } catch (err) {
    // Tab might have been closed
    console.debug("[ServiceWorker] Badge update ignored:", err.message);
  }
}

/**
 * Initializes or refreshes adapter with settings from storage.
 */
async function syncAdapterSettings() {
  const data = await chrome.storage.local.get(["apiBaseUrl", "forceMock", "protectionEnabled"]);
  const apiBaseUrl = data.apiBaseUrl || "http://127.0.0.1:8000/api/v1";
  const forceMock = !!data.forceMock;

  currentAdapter = new DetectionAdapter({
    apiBaseUrl,
    forceMock,
    timeoutMs: 3000,
  });

  return {
    protectionEnabled: data.protectionEnabled !== false,
    apiBaseUrl,
    forceMock,
  };
}

/**
 * Extension installation and upgrade lifecycle.
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log(`[ServiceWorker] ClickShield installed/updated (reason: ${details.reason}).`);

  const existing = await chrome.storage.local.get([
    "protectionEnabled",
    "apiBaseUrl",
    "forceMock",
    "stats",
  ]);

  const defaults = {
    protectionEnabled: existing.protectionEnabled !== undefined ? existing.protectionEnabled : true,
    apiBaseUrl: existing.apiBaseUrl || "http://127.0.0.1:8000/api/v1",
    forceMock: existing.forceMock !== undefined ? existing.forceMock : false,
    stats: existing.stats || {
      scansCount: 0,
      threatsBlocked: 0,
      lastScanAt: null,
    },
  };

  await chrome.storage.local.set(defaults);
  await syncAdapterSettings();
  await updateBadge(null, defaults.protectionEnabled ? "OK" : "OFF", defaults.protectionEnabled ? "#10b981" : "#64748b");
});

/**
 * Service worker startup / wake-up.
 */
chrome.runtime.onStartup.addListener(async () => {
  await syncAdapterSettings();
});

/**
 * Listens to top-level navigation before network commit.
 * Manifest V3 technical note: webNavigation is observational. For known high-risk
 * destinations already in cache, we immediately redirect the tab to the warning interstitial.
 */
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return; // Only intercept main frame

  const url = details.url;
  const val = validateUrl(url);
  if (!val.valid) return;

  const { protectionEnabled } = await chrome.storage.local.get("protectionEnabled");
  if (protectionEnabled === false) return;

  if (urlCache.isBypassed(url)) return;

  const cached = urlCache.get(url);
  if (cached && (cached.is_phishing || cached.risk_level === "High")) {
    console.warn("[ServiceWorker] Intercepting navigation to known high-risk destination:", url);
    const warningUrl = getWarningUrl(url, cached.risk_level, cached.risk_score, cached.top_indicators, "pre_navigation");
    await chrome.tabs.update(details.tabId, { url: warningUrl });
    await updateBadge(details.tabId, "!", "#ef4444");
  }
});

/**
 * Constructs local extension warning interstitial URL with encoded parameters.
 */
function getWarningUrl(targetUrl, riskLevel, riskScore, indicators = [], source = "pre_click") {
  const reasons = Array.isArray(indicators)
    ? indicators.map((ind) => (typeof ind === "string" ? ind : ind.description || ind.feature))
    : [];

  const params = new URLSearchParams({
    target: targetUrl,
    risk: riskLevel || "High",
    score: String(riskScore ?? 0.85),
    source,
    reasons: JSON.stringify(reasons),
  });

  return chrome.runtime.getURL(`warning/warning.html?${params.toString()}`);
}

/**
 * Primary Message Router
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const action = message?.action;
  const tabId = sender.tab?.id;

  // Process asynchronously
  (async () => {
    try {
      switch (action) {
        case "PING": {
          const settings = await syncAdapterSettings();
          const health = await currentAdapter.checkHealth();
          sendResponse({
            status: "ACTIVE",
            version: "1.0.0",
            settings,
            health,
          });
          break;
        }

        case "GET_SETTINGS": {
          const data = await chrome.storage.local.get([
            "protectionEnabled",
            "apiBaseUrl",
            "forceMock",
            "stats",
            "lastScan",
          ]);
          sendResponse({
            protectionEnabled: data.protectionEnabled !== false,
            apiBaseUrl: data.apiBaseUrl || "http://127.0.0.1:8000/api/v1",
            forceMock: !!data.forceMock,
            stats: data.stats || { scansCount: 0, threatsBlocked: 0, lastScanAt: null },
            lastScan: data.lastScan || null,
          });
          break;
        }

        case "SAVE_SETTINGS": {
          const updates = {};
          if (typeof message.protectionEnabled === "boolean") {
            updates.protectionEnabled = message.protectionEnabled;
            await updateBadge(null, message.protectionEnabled ? "OK" : "OFF", message.protectionEnabled ? "#10b981" : "#64748b");
          }
          if (typeof message.apiBaseUrl === "string") {
            updates.apiBaseUrl = message.apiBaseUrl.trim();
          }
          if (typeof message.forceMock === "boolean") {
            updates.forceMock = message.forceMock;
          }

          await chrome.storage.local.set(updates);
          await syncAdapterSettings();
          sendResponse({ success: true, updates });
          break;
        }

        case "ANALYZE_URL": {
          const targetUrl = message.url;
          const referrer = message.referrer || "";
          const forceRefresh = !!message.forceRefresh;

          const val = validateUrl(targetUrl);
          if (!val.valid) {
            sendResponse({ valid: false, error: val.error, url: targetUrl });
            return;
          }

          const { protectionEnabled } = await chrome.storage.local.get("protectionEnabled");
          if (protectionEnabled === false) {
            sendResponse({
              skipped: true,
              reason: "ClickShield protection disabled by user",
              url: targetUrl,
            });
            return;
          }

          // Check if previously bypassed in this session
          if (urlCache.isBypassed(targetUrl)) {
            sendResponse({
              bypassed: true,
              url: targetUrl,
              risk_level: "Bypassed",
              risk_score: 0.0,
            });
            return;
          }

          // Check in-flight deduplication
          let pendingPromise = urlCache.getInFlight(targetUrl);
          if (!pendingPromise) {
            // Check cache
            if (!forceRefresh) {
              const cached = urlCache.get(targetUrl);
              if (cached) {
                sendResponse({ ...cached, from_cache: true });
                return;
              }
            }

            // Execute analysis
            await syncAdapterSettings();
            pendingPromise = currentAdapter.analyzeUrl(targetUrl, referrer);
            urlCache.setInFlight(targetUrl, pendingPromise);
          }

          let result;
          try {
            result = await pendingPromise;
          } finally {
            urlCache.clearInFlight(targetUrl);
          }

          // Cache and persist stats
          urlCache.set(targetUrl, result);

          const { stats = { scansCount: 0, threatsBlocked: 0 } } = await chrome.storage.local.get("stats");
          stats.scansCount = (stats.scansCount || 0) + 1;
          stats.lastScanAt = new Date().toISOString();

          if (result.is_phishing || result.risk_level === "High") {
            stats.threatsBlocked = (stats.threatsBlocked || 0) + 1;
            if (tabId) await updateBadge(tabId, "!", "#ef4444");
          } else if (result.risk_level === "Medium") {
            if (tabId) await updateBadge(tabId, "WARN", "#f59e0b");
          } else {
            if (tabId) await updateBadge(tabId, "OK", "#10b981");
          }

          await chrome.storage.local.set({ stats, lastScan: result });
          sendResponse(result);
          break;
        }

        case "ANALYZE_CONTENT": {
          const telemetry = message.telemetry || {};
          const { protectionEnabled } = await chrome.storage.local.get("protectionEnabled");

          if (protectionEnabled === false) {
            sendResponse({ skipped: true, reason: "Protection disabled" });
            return;
          }

          if (telemetry.url && urlCache.isBypassed(telemetry.url)) {
            sendResponse({ bypassed: true, url: telemetry.url });
            return;
          }

          await syncAdapterSettings();
          const result = await currentAdapter.analyzeContent(telemetry);

          const { stats = { scansCount: 0, threatsBlocked: 0 } } = await chrome.storage.local.get("stats");
          stats.scansCount = (stats.scansCount || 0) + 1;
          stats.lastScanAt = new Date().toISOString();

          if (result.recommended_action === "BLOCK" || result.is_phishing || result.risk_level === "High") {
            stats.threatsBlocked = (stats.threatsBlocked || 0) + 1;
            if (tabId) await updateBadge(tabId, "!", "#ef4444");
          } else if (result.risk_level === "Medium") {
            if (tabId) await updateBadge(tabId, "WARN", "#f59e0b");
          } else {
            if (tabId) await updateBadge(tabId, "OK", "#10b981");
          }

          await chrome.storage.local.set({ stats, lastScan: result });
          sendResponse(result);
          break;
        }

        case "RECORD_BYPASS": {
          const targetUrl = message.url;
          if (targetUrl) {
            urlCache.recordBypass(targetUrl);
            console.log("[ServiceWorker] User recorded session bypass for:", targetUrl);
          }
          sendResponse({ success: true });
          break;
        }

        case "NAVIGATE_TO_WARNING": {
          const { targetUrl, riskLevel, riskScore, reasons, source } = message;
          const warningUrl = getWarningUrl(targetUrl, riskLevel, riskScore, reasons, source);
          const targetTabId = message.tabId || tabId;

          if (targetTabId) {
            await chrome.tabs.update(targetTabId, { url: warningUrl });
            await updateBadge(targetTabId, "!", "#ef4444");
          }
          sendResponse({ success: true, warningUrl });
          break;
        }

        case "NAVIGATE_TO_URL": {
          const targetUrl = message.url;
          const targetTabId = message.tabId || tabId;
          if (targetTabId && targetUrl) {
            await chrome.tabs.update(targetTabId, { url: targetUrl });
          }
          sendResponse({ success: true });
          break;
        }

        case "GET_LAST_SCAN": {
          const data = await chrome.storage.local.get("lastScan");
          sendResponse({ lastScan: data.lastScan || null });
          break;
        }

        default:
          sendResponse({ error: `Unknown action: ${action}` });
      }
    } catch (err) {
      console.error("[ServiceWorker] Error handling message:", err);
      sendResponse({ error: err.message });
    }
  })();

  return true; // Keep message channel open for async response
});
