/**
 * Popup Script
 * 
 * Manages user interactions in the toolbar popup, queries current tab URL,
 * and requests analysis from backend / background service worker.
 */

document.addEventListener("DOMContentLoaded", async () => {
  const currentUrlEl = document.getElementById("current-url");
  const scanBtn = document.getElementById("scan-btn");
  const riskTag = document.getElementById("risk-tag");

  // Fetch the active tab's URL
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      currentUrlEl.textContent = tab.url;
    } else {
      currentUrlEl.textContent = "Unable to read tab URL";
    }
  } catch (error) {
    console.error("Error retrieving active tab:", error);
    currentUrlEl.textContent = "Active tab error";
  }

  // Scan button placeholder
  scanBtn.addEventListener("click", () => {
    riskTag.textContent = "Mock: Low";
    riskTag.className = "risk-tag risk-low";
    alert("Phase 1 Preview: Real-time scan will connect to FastAPI backend in Phase 6.");
  });
});
