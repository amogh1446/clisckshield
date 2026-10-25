/**
 * Post-Click DOM Content Threat Analysis Unit Tests
 */

const { test, describe } = require("node:test");
const assert = require("node:assert");
const { ContentHeuristicEngine } = require("../core/detection-adapter.js");

describe("ContentHeuristicEngine — Post-Click DOM Rules", () => {
  test("detects unencrypted HTTP password submission as critical threat", () => {
    const telemetry = {
      url: "http://unencrypted-login.com/auth",
      page_title: "Sign In",
      has_password_field: true,
      has_credit_card_field: false,
      form_action_url: null,
      is_https: false,
      external_links_ratio: 0.1,
      has_hidden_iframes: false,
    };

    const res = ContentHeuristicEngine.analyze(telemetry);
    assert.ok(res.reasons.some((r) => r.includes("unencrypted HTTP")));
    assert.ok(res.risk_score >= 0.40);
  });

  test("detects credential form submitting to foreign host (credential harvesting)", () => {
    const telemetry = {
      url: "https://legit-looking-portal.com/login",
      page_title: "Account Sign In",
      has_password_field: true,
      has_credit_card_field: false,
      form_action_url: "https://evil-third-party-harvester.ru/post.php",
      is_https: true,
      external_links_ratio: 0.2,
      has_hidden_iframes: false,
    };

    const res = ContentHeuristicEngine.analyze(telemetry);
    assert.ok(
      res.reasons.some((r) => r.includes("mismatched foreign host")),
      "Must flag cross-origin form action target"
    );
    assert.strictEqual(res.recommended_action, "WARN");
  });

  test("flags brand impersonation in page title on unauthorized domain", () => {
    const telemetry = {
      url: "https://unauthorized-domain.com/secure-portal",
      page_title: "PayPal Security Verification",
      has_password_field: true,
      has_credit_card_field: false,
      form_action_url: "https://unauthorized-domain.com/submit",
      is_https: true,
      external_links_ratio: 0.2,
      has_hidden_iframes: false,
      brand_impersonation_clue: "paypal",
    };

    const res = ContentHeuristicEngine.analyze(telemetry);
    assert.ok(
      res.reasons.some((r) => r.includes("Target brand 'paypal' detected")),
      "Must flag brand impersonation in content"
    );
  });

  test("detects combined threat: HTTP + password + brand impersonation -> BLOCK", () => {
    const telemetry = {
      url: "http://192.168.1.1/paypal/login.php",
      page_title: "PayPal Verification",
      has_password_field: true,
      has_credit_card_field: true,
      form_action_url: "http://thirdparty.ru/steal.php",
      is_https: false,
      external_links_ratio: 0.9,
      has_hidden_iframes: true,
      brand_impersonation_clue: "paypal",
      urgency_phrases_count: 2,
    };

    const res = ContentHeuristicEngine.analyze(telemetry);
    assert.strictEqual(res.risk_level, "High");
    assert.strictEqual(res.is_phishing, true);
    assert.strictEqual(res.recommended_action, "BLOCK");
    assert.ok(res.risk_score >= 0.70);
  });

  test("permits normal HTTPS webpage without credential risks -> ALLOW", () => {
    const telemetry = {
      url: "https://mycompany.com/blog/article",
      page_title: "Engineering Blog Post",
      has_password_field: false,
      has_credit_card_field: false,
      form_action_url: null,
      is_https: true,
      external_links_ratio: 0.3,
      has_hidden_iframes: false,
      brand_impersonation_clue: null,
      urgency_phrases_count: 0,
    };

    const res = ContentHeuristicEngine.analyze(telemetry);
    assert.strictEqual(res.risk_level, "Low");
    assert.strictEqual(res.is_phishing, false);
    assert.strictEqual(res.recommended_action, "ALLOW");
    assert.ok(res.risk_score <= 0.20);
  });
});
