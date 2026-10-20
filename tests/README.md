# End-to-End & Integration Tests

This directory houses cross-component integration tests and safe fixture payloads.

---

## 📁 Directory Architecture

```text
tests/
├── integration/      # End-to-end and multi-service workflows (e.g. extension payload -> backend -> ML)
├── fixtures/         # Static HTML templates, sample URLs, and simulated DOM trees
└── README.md         # This documentation file
```

---

## 🛡️ Testing Guidelines

1. **Safety First**: Never test against live malicious domains. Use mock payloads or synthetic benign sites.
2. **Integration Focus**: Member 4 is responsible for running integration tests in Phase 8 to verify that:
   - The Chrome extension payload matches backend Pydantic schemas.
   - The backend responses render correctly in the React dashboard.
