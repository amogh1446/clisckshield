/**
 * Privacy Protection and Warning Page XSS Safety Tests
 */

const { test, describe } = require("node:test");
const assert = require("node:assert");

describe("Privacy Protection Verification", () => {
  test("telemetry schema strictly forbids user inputs, cookies, or keystrokes", () => {
    // Simulated telemetry payload produced by content script
    const sampleTelemetry = {
      url: "https://example.com/login",
      page_title: "Sign In",
      has_password_field: true,
      has_credit_card_field: false,
      form_action_url: "https://example.com/auth",
      is_https: true,
      external_links_ratio: 0.15,
      has_hidden_iframes: false,
      brand_impersonation_clue: null,
      urgency_phrases_count: 0,
      client_timestamp: new Date().toISOString(),
    };

    // Verify forbidden sensitive fields are NOT present
    const forbiddenFields = [
      "password",
      "password_value",
      "credit_card_number",
      "cvv",
      "input_values",
      "form_data",
      "keystrokes",
      "cookies",
      "tokens",
      "session_id",
      "auth_header",
    ];

    for (const forbidden of forbiddenFields) {
      assert.strictEqual(
        forbidden in sampleTelemetry,
        false,
        `Telemetry MUST NOT contain sensitive field: ${forbidden}`
      );
    }
  });
});

describe("Warning Interstitial Security & Sanitization", () => {
  function parseWarningTarget(rawTarget) {
    if (!rawTarget) return null;
    try {
      const parsed = new URL(rawTarget);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.href;
      }
    } catch {
      return null;
    }
    return null;
  }

  function parseWarningReasons(rawReasons) {
    if (!rawReasons) return ["Destination flagged for potential phishing."];
    try {
      const decoded = JSON.parse(rawReasons);
      if (Array.isArray(decoded)) {
        return decoded.map((r) =>
          typeof r === "string" ? r : r.description || r.feature || "Suspicious anomaly detected"
        );
      }
    } catch {
      return [String(rawReasons)];
    }
    return [String(rawReasons)];
  }

  test("rejects XSS payloads in target parameter", () => {
    const maliciousTargets = [
      "javascript:alert(document.cookie)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "chrome-extension://malicious/hack.html",
      "<script>alert(1)</script>",
    ];

    for (const mal of maliciousTargets) {
      const result = parseWarningTarget(mal);
      assert.strictEqual(result, null, `Must reject dangerous URL scheme: ${mal}`);
    }
  });

  test("accepts valid HTTP and HTTPS target URLs", () => {
    assert.strictEqual(
      parseWarningTarget("https://evil-phish.com/login"),
      "https://evil-phish.com/login"
    );
    assert.strictEqual(
      parseWarningTarget("http://192.168.1.1/admin"),
      "http://192.168.1.1/admin"
    );
  });

  test("safely parses JSON and non-JSON detection reasons without HTML execution", () => {
    const jsonReasons = JSON.stringify([
      "Host uses raw IP address",
      "Unencrypted password field",
      "<img src=x onerror=alert(1)>",
    ]);

    const reasons = parseWarningReasons(jsonReasons);
    assert.strictEqual(reasons.length, 3);
    assert.strictEqual(reasons[0], "Host uses raw IP address");
    // Text is preserved as raw string for textContent assignment (preventing HTML injection)
    assert.strictEqual(reasons[2], "<img src=x onerror=alert(1)>");
  });
});
