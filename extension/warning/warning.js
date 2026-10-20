/**
 * Warning Interstitial Script
 * 
 * Manages user options when blocked by high-risk phishing classification.
 */

document.addEventListener("DOMContentLoaded", () => {
  const safetyBtn = document.getElementById("safety-btn");
  const proceedBtn = document.getElementById("proceed-btn");
  const targetUrlEl = document.getElementById("target-url");

  // Read URL query parameters to display target
  const urlParams = new URLSearchParams(window.location.search);
  const target = urlParams.get("target");
  if (target) {
    targetUrlEl.textContent = target;
  }

  // Back to safety action
  safetyBtn.addEventListener("click", () => {
    window.history.back();
  });

  // Override/proceed action
  proceedBtn.addEventListener("click", () => {
    if (confirm("Proceeding may expose your credentials or personal data. Are you absolutely certain?")) {
      if (target) {
        window.location.href = target;
      }
    }
  });
});
