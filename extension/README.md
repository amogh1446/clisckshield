# Chrome Extension — Phishing Protection (Manifest V3)

This browser extension serves as the first line of defense, monitoring user navigation, intercepting suspicious links, and alerting users to dangerous sites.

**Assigned Team Member**: Member 3  
**Target Feature Branch**: `feature/extension`

---

## 📁 Directory Architecture

```text
extension/
├── manifest.json         # Manifest V3 registration and security permissions
├── background/
│   └── service-worker.js # Event handling, pre-click analysis API calls, navigation guards
├── content/
│   └── content-script.js # Post-click DOM analysis (login forms, links, scripts)
├── popup/                # Popup toolbar menu
│   ├── popup.html        # Status layout and manual inspection input
│   ├── popup.js          # Popup controller logic
│   └── popup.css         # Styling for popup
├── warning/              # Full-page interstitial warning screen
│   ├── warning.html      # Block screen shown when navigating to High Risk URLs
│   ├── warning.js        # "Go back" vs "Proceed anyway" actions
│   └── warning.css       # Danger warning styling
├── lib/                  # Shared helper utilities (API client, URL parsers)
└── README.md             # This documentation file
```

---

## ⚙️ How to Load in Google Chrome (Windows)

1. Open **Google Chrome** and navigate to `chrome://extensions/`.
2. Toggle on the **Developer mode** switch (top-right corner).
3. Click the **Load unpacked** button (top-left).
4. In the folder browser, select this `extension/` directory.
5. The extension icon will appear in your Chrome toolbar.

---

## 🔒 Permissions & Safety

- **`webNavigation`**: Enables intercepting navigation before network requests resolve.
- **`activeTab`**: Allows reading DOM properties only on the actively focused tab.
- **`storage`**: Caches recent scan results locally to minimize redundant backend queries.
- **Privacy Assurance**: No page content or passwords are sent outside `127.0.0.1:8000`. No third-party ad networks or trackers are loaded.

---

## 📌 Phase Status

- **Current (Phase 1)**: Manifest V3 configuration and starter scripts created.
- **Next for Extension (Phase 6)**: Integrating backend API calls, DOM scraping heuristics, and interactive warning flows.
