/**
 * Detection Adapter & API Resiliency Unit Tests
 */

const { test, describe } = require("node:test");
const assert = require("node:assert");
const { DetectionAdapter } = require("../core/detection-adapter.js");

describe("DetectionAdapter — Backend Integration & Fallbacks", () => {
  test("forceMock mode returns local heuristic results marked as is_mock: true", async () => {
    const adapter = new DetectionAdapter({ forceMock: true });
    const result = await adapter.analyzeUrl("http://192.168.1.1/paypal/login.php");

    assert.strictEqual(result.is_mock, true, "Must flag is_mock as true");
    assert.strictEqual(result.adapter_mode, "forced_mock");
    assert.ok(result.risk_score >= 0.70);
    assert.strictEqual(result.risk_level, "High");
    assert.strictEqual(result.is_phishing, true);
    assert.ok(Array.isArray(result.top_indicators));
  });

  test("offline backend gracefully falls back to local heuristics with is_mock: true", async () => {
    // Port 59123 is closed, simulating offline backend
    const adapter = new DetectionAdapter({
      apiBaseUrl: "http://127.0.0.1:59123/api/v1",
      timeoutMs: 800,
    });

    const result = await adapter.analyzeUrl("https://paypal-verify-account.tk/signin");

    assert.ok(result, "Must return an analysis object even when backend is offline");
    assert.strictEqual(result.is_mock, true, "Must be tagged as mock");
    assert.strictEqual(result.adapter_mode, "fallback_heuristic");
    assert.ok(result.risk_score >= 0.70);
    assert.strictEqual(result.risk_level, "High");
    assert.strictEqual(result.is_phishing, true);
  });

  test("health check reports offline when backend is unreachable", async () => {
    const adapter = new DetectionAdapter({
      apiBaseUrl: "http://127.0.0.1:59123/api/v1",
      timeoutMs: 500,
    });

    const health = await adapter.checkHealth();
    assert.strictEqual(health.online, false);
    assert.ok(health.error);
  });

  test("analyzeContent gracefully falls back when content endpoint is not deployed", async () => {
    const adapter = new DetectionAdapter({
      apiBaseUrl: "http://127.0.0.1:59123/api/v1",
      timeoutMs: 500,
    });

    const telemetry = {
      url: "http://192.168.1.1/login",
      page_title: "Router Login",
      has_password_field: true,
      has_credit_card_field: false,
      form_action_url: null,
      is_https: false,
      external_links_ratio: 0.1,
      has_hidden_iframes: false,
    };

    const result = await adapter.analyzeContent(telemetry);
    assert.strictEqual(result.is_mock, true);
    assert.strictEqual(result.adapter_mode, "fallback_heuristic");
    assert.ok(result.reasons.length > 0);
  });

  test("returns valid schema matching backend URLAnalysisResponse specification", async () => {
    const adapter = new DetectionAdapter({ forceMock: true });
    const result = await adapter.analyzeUrl("https://example.com");

    // Conformance with backend/app/schemas/analysis.py URLAnalysisResponse
    assert.ok(typeof result.url === "string", "url must be string");
    assert.ok(typeof result.risk_score === "number", "risk_score must be number");
    assert.ok(result.risk_score >= 0.0 && result.risk_score <= 1.0, "risk_score between 0 and 1");
    assert.ok(["Low", "Medium", "High", "Unknown"].includes(result.risk_level), "valid risk_level");
    assert.ok(typeof result.is_phishing === "boolean", "is_phishing must be boolean");
    assert.ok(typeof result.confidence === "number", "confidence must be number");
    assert.ok(typeof result.is_mock === "boolean", "is_mock must be boolean");
    assert.ok(Array.isArray(result.top_indicators), "top_indicators must be array");
    assert.ok(typeof result.evaluated_at === "string", "evaluated_at must be timestamp");
  });
});
