/**
 * Background Service Worker (Manifest V3)
 * 
 * Handles browser navigation events, communicates with the FastAPI backend
 * for pre-click URL risk analysis, and triggers interstitial warnings.
 */

const BACKEND_API_BASE = "http://127.0.0.1:8000/api/v1";

console.log("[ServiceWorker] AI Phishing Protection service worker initialized.");

// Listener for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("[ServiceWorker] Extension installed successfully (Phase 1 Scaffolding).");
});

// Listener for messages from popup or content-script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[ServiceWorker] Received message:", message.action);

  if (message.action === "PING") {
    sendResponse({ status: "ACTIVE", version: "0.1.0" });
    return true;
  }

  // Phase 6 will handle "ANALYZE_URL" and "DOM_TELEMETRY" events
  sendResponse({ status: "NOT_IMPLEMENTED", note: "Phase 6 integration pending" });
  return true;
});
