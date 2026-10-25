# ClickShield Chrome Extension (Manifest V3)

AI-powered real-time phishing protection browser extension featuring pre-click link verification and post-click webpage DOM threat analysis.

---

## 🛡️ Architecture & Components

```text
extension/
├── manifest.json              # Manifest V3 registration, permissions, icons, and CSP
├── background/
│   └── service-worker.js      # Ephemeral event router, navigation monitor, cache & badge controller
├── content/
│   └── content-script.js      # Link click interception, hover pre-fetch, bounded DOM threat inspection
├── popup/                     # Toolbar popup UI
│   ├── popup.html             # Matte dark interface layout with threat score meter
│   ├── popup.css              # Dark security theme styling with purple accents
│   └── popup.js               # Tab query, scan triggers, health checks, settings persistence
├── warning/                   # Warning interstitial screen
│   ├── warning.html           # High-risk phishing blocked page layout
│   ├── warning.css            # Danger alert styling
│   └── warning.js             # Safe DOM rendering, back-to-safety & confirmed bypass logic
├── core/                      # Core engine modules
│   ├── detection-adapter.js   # URL validator, lexical/domain heuristics, DOM heuristics, API client
│   └── cache.js               # TTL LRU cache, request deduplication, session bypass store
├── icons/                     # Official extension icons
│   ├── icon-16.png            # 16x16 toolbar icon
│   ├── icon-32.png            # 32x32 action icon
│   ├── icon-48.png            # 48x48 management icon
│   ├── icon-128.png           # 128x128 store & details icon
│   └── generate.js            # Standalone PNG generator script
├── tests/                     # Automated unit and integration test suite
│   ├── test_manifest.js
│   ├── test_validation_and_heuristics.js
│   ├── test_content_heuristics.js
│   ├── test_detection_adapter.js
│   ├── test_cache.js
│   └── test_privacy_and_warning_safety.js
├── run-tests.js               # Test discovery and execution runner
└── README.md                  # This documentation file
```

---

## 🚀 How to Load in Google Chrome

1. Open **Google Chrome** and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle switch in the upper-right corner.
3. Click the **Load unpacked** button in the top-left toolbar.
4. Browse to and select the `extension/` folder in this repository:
   `D:\Projects\clisckshield\extension`
5. Click **Select Folder**.
6. The **ClickShield - AI Phishing Protection** extension will appear in your extensions list. Pin it to your toolbar for easy access.

---

## 🧪 Testing Verification Guide

### Automated Test Suite

Run all automated unit and integration tests from the repository root:

```powershell
node extension/run-tests.js
```

This verifies:
- Manifest V3 validity, permissions, and file presence.
- RFC-compliant URL validation and scheme restrictions.
- Pre-click lexical and domain heuristic rules (IP hosts, brand spoofing, abused TLDs, subdomains, homographs, hyphens).
- Post-click DOM content heuristics (plain HTTP password submission, cross-domain form actions, hidden iframes, urgency phrases).
- API client resiliency, network timeouts, offline backend fallbacks, and schema conformance.
- In-memory TTL cache, LRU capacity eviction, request deduplication, and session bypass tracking.
- Strict data privacy guarantees (no passwords, values, or keystrokes captured).
- XSS prevention in the warning interstitial.

### Manual Verification in the Browser

#### 1. Safe URL Verification
1. Navigate to any legitimate site (e.g., `https://wikipedia.org` or `https://www.google.com`).
2. Click the ClickShield icon in the toolbar.
3. The popup opens with:
   - Green active badge ("Protected").
   - Safely truncated current destination URL.
   - Risk assessment: **Safe** (`Low Risk`, `0% - 15%`).
   - Threat indicators: "No phishing or deception indicators detected."
   - Toolbar badge displays `OK` in green.

#### 2. Simulated Pre-Click Phishing Link Interception
1. Visit a page containing a simulated suspicious or phishing link (or create a local HTML file with `<a href="http://192.168.1.1/paypal/login.php">Verify PayPal</a>` or `<a href="http://paypal-security-update.tk/login">Update Account</a>`).
2. When hovering over the link, ClickShield pre-fetches the analysis in the background.
3. When clicking the link, ClickShield immediately intercepts the navigation, prevents browser commit, and redirects to:
   `warning/warning.html?target=...&risk=High&source=pre_click_interception`
4. The warning interstitial displays:
   - "Deceptive Site Intercepted" header.
   - The destination URL safely rendered in a monospace block.
   - Specific detected indicators (e.g., raw IP host, brand impersonation on untrusted host, unencrypted credential submission).
   - Click **Back to Safety (Recommended)** to safely return to the previous page.
   - Open **Advanced Details & Risk Bypass** to verify the confirmation prompt before proceeding.

#### 3. Simulated Post-Click DOM Analysis
1. Visit a webpage that loads over plain HTTP and renders a password input or a form posting to a foreign domain (e.g. `<form action="http://evil-tracker.ru/post"><input type="password"></form>`).
2. Upon page load, ClickShield content script runs post-click inspection.
3. High-risk credential harvesting indicators are detected.
4. The extension unloads the deceptive page and displays the warning interstitial (`source=post_click_dom`).

#### 4. Offline / Backend Unavailable Handling
1. If the FastAPI backend is not running, ClickShield automatically switches to its built-in Local Heuristic Engine (`is_mock: true`).
2. The popup displays: "Backend Offline — Using Local Heuristics" in amber.
3. Threat detection continues functioning locally without errors or delays.

---

## 🔌 Backend & ML Integration Contract

ClickShield is fully decoupled and ready for Member 2 (Backend) and Member 4 (ML):

1. **Pre-Click URL Analysis**:
   - `POST /api/v1/analyze/url`
   - Request: `{ "url": string, "referrer": string | null, "client_timestamp": string }`
   - Expected Response:
     ```json
     {
       "url": "http://192.168.1.1/paypal/login.php",
       "risk_score": 0.88,
       "risk_level": "High",
       "is_phishing": true,
       "confidence": 0.92,
       "is_mock": false,
       "top_indicators": [
         { "feature": "ip_address_host", "impact": 0.35, "description": "Host uses a raw IP address." }
       ],
       "evaluated_at": "2026-10-25T12:00:00Z"
     }
     ```

2. **Post-Click Content Analysis**:
   - `POST /api/v1/analyze/content`
   - Request:
     ```json
     {
       "url": "http://suspicious-site.com/auth",
       "page_title": "Sign In",
       "has_password_field": true,
       "has_credit_card_field": false,
       "form_action_url": "http://untrusted-host.ru/post",
       "is_https": false,
       "external_links_ratio": 0.85,
       "has_hidden_iframes": false,
       "client_timestamp": "2026-10-25T12:00:00Z"
     }
     ```
   - Expected Response:
     ```json
     {
       "url": "http://suspicious-site.com/auth",
       "risk_score": 0.94,
       "risk_level": "High",
       "is_phishing": true,
       "is_mock": false,
       "reasons": ["Password submitted over plain HTTP", "Cross-domain credential post"],
       "recommended_action": "BLOCK",
       "evaluated_at": "2026-10-25T12:00:00Z"
     }
     ```

3. **Backend Health Check**:
   - `GET /api/v1/health`
   - Responds with `{ "status": "healthy", "version": "1.0.0", "model_loaded": true, ... }`.

---

## 🔒 Privacy & Security Guarantees

- **No Sensitive Data Access**: Content scripts NEVER read or transmit `input.value`, passwords, keystrokes, form submissions, session tokens, or cookies. Only DOM metadata (presence, tag names, attribute patterns, element counts) is evaluated.
- **Strict Content Security Policy**: Zero `eval()`, zero inline `<script>` tags, zero inline event handlers (`onclick`).
- **XSS Prevention**: Untrusted parameters and threat reasons in popup and warning pages are rendered exclusively with `textContent` and `createElement()`.
- **Least Privilege Permissions**: Declares only `storage`, `activeTab`, `tabs`, and `webNavigation`.
