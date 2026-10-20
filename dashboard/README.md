# Dashboard — Phishing Detection Analytics & Investigation

A clean, modern React dashboard for viewing real-time phishing detection logs, risk score distributions, and SHAP model explanations.

**Assigned Team Member**: Member 4  
**Target Feature Branch**: `feature/dashboard-qa`

---

## 📁 Directory Architecture

```text
dashboard/
├── src/
│   ├── components/   # Reusable UI widgets (StatCards, RiskBadge, Navbar)
│   ├── pages/        # Main views (Overview, DetectionHistory, URLInspector)
│   ├── services/     # Axios / Fetch client calling FastAPI backend (/api/v1/history)
│   ├── App.jsx       # Root layout and routing logic
│   └── main.jsx      # React DOM entry point
├── public/           # Static assets & icons
├── package.json      # Dependencies and scripts (Vite + React)
└── README.md         # This documentation file
```

---

## 🚀 Running on Windows (Local Development)

```powershell
cd dashboard
npm install
npm run dev
```

The development server runs by default at `http://localhost:3000` (or `http://localhost:5173`).

---

## 📌 Phase Status

- **Current (Phase 1)**: Starter scaffolding, configuration, and layout shell created.
- **Next for Dashboard (Phase 7)**: Connecting live detection logs, risk charts, and URL inspection playground.
