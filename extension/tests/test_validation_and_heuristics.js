/**
 * URL Validation and Pre-Click Heuristic Analysis Unit Tests
 */

const { test, describe } = require("node:test");
const assert = require("node:assert");
const {
  validateUrl,
  normalizeUrl,
  isIpAddress,
  HeuristicEngine,
} = require("../core/detection-adapter.js");

describe("URL Validation & Normalization", () => {
  test("accepts valid HTTPS and HTTP URLs", () => {
    assert.strictEqual(validateUrl("https://example.com").valid, true);
    assert.strictEqual(validateUrl("http://example.com/test?q=1").valid, true);
    assert.strictEqual(validateUrl("https://sub.domain.org/path/file.html").valid, true);
  });

  test("rejects empty or whitespace URLs", () => {
    assert.strictEqual(validateUrl("").valid, false);
    assert.strictEqual(validateUrl("   ").valid, false);
    assert.strictEqual(validateUrl(null).valid, false);
    assert.strictEqual(validateUrl(undefined).valid, false);
  });

  test("rejects unsupported schemes (javascript, file, mailto, chrome)", () => {
    assert.strictEqual(validateUrl("javascript:alert(1)").valid, false);
    assert.strictEqual(validateUrl("mailto:user@example.com").valid, false);
    assert.strictEqual(validateUrl("file:///C:/secret.txt").valid, false);
    assert.strictEqual(validateUrl("chrome://extensions").valid, false);
    assert.strictEqual(validateUrl("data:text/html,<h1>XSS</h1>").valid, false);
  });

  test("rejects URLs exceeding 2048 characters", () => {
    const longUrl = "https://example.com/" + "a".repeat(2050);
    const res = validateUrl(longUrl);
    assert.strictEqual(res.valid, false);
    assert.ok(res.error.includes("2048"));
  });

  test("normalizes URLs consistently", () => {
    assert.strictEqual(
      normalizeUrl("https://EXAMPLE.COM/login/"),
      "https://example.com/login"
    );
    assert.strictEqual(
      normalizeUrl("https://example.com:443/"),
      "https://example.com/"
    );
  });

  test("correctly identifies IP addresses", () => {
    assert.strictEqual(isIpAddress("192.168.1.1"), true);
    assert.strictEqual(isIpAddress("10.0.0.1"), true);
    assert.strictEqual(isIpAddress("256.0.0.1"), false);
    assert.strictEqual(isIpAddress("example.com"), false);
    assert.strictEqual(isIpAddress("paypal.com"), false);
  });
});

describe("Heuristic Risk Engine — Pre-Click Rules", () => {
  test("evaluates raw IP host with brand and credentials as High Risk phishing", () => {
    const res = HeuristicEngine.analyze("http://192.168.1.1/paypal/login.php");
    assert.ok(res.risk_score >= 0.70, "Should be high risk due to IP + brand + credentials + HTTP");
    assert.strictEqual(res.risk_level, "High");
    assert.strictEqual(res.is_phishing, true);
    const hasIpIndicator = res.top_indicators.some((i) => i.feature === "ip_address_host");
    assert.ok(hasIpIndicator, "Must include ip_address_host feature");
  });

  test("detects brand impersonation on unauthorized host with abused TLD", () => {
    const res = HeuristicEngine.analyze("http://paypal-security-update.tk/login");
    assert.ok(res.risk_score >= 0.70, "Should be flagged as High Risk");
    assert.strictEqual(res.risk_level, "High");
    assert.strictEqual(res.is_phishing, true);
    const brandInd = res.top_indicators.find((i) => i.feature === "brand_impersonation");
    assert.ok(brandInd, "Must include brand_impersonation feature");
    assert.ok(brandInd.description.includes("paypal"), "Must identify paypal as targeted brand");
  });

  test("evaluates domain with credentials and hyphens as Medium risk", () => {
    const res = HeuristicEngine.analyze("https://account-security-update.com/login");
    assert.strictEqual(res.risk_level, "Medium");
    assert.strictEqual(res.is_phishing, false);
  });

  test("does NOT flag legitimate brand domain as impersonation", () => {
    const res = HeuristicEngine.analyze("https://www.paypal.com/signin");
    assert.strictEqual(res.risk_level, "Low", "Legitimate paypal domain should be Low risk");
    assert.strictEqual(res.is_phishing, false);
    const brandInd = res.top_indicators.find((i) => i.feature === "brand_impersonation");
    assert.strictEqual(brandInd, undefined, "Should not flag official brand host");
  });

  test("detects suspicious top-level domains (.tk, .xyz, etc.)", () => {
    const res = HeuristicEngine.analyze("http://secure-login.tk/auth");
    const tldInd = res.top_indicators.find((i) => i.feature === "suspicious_tld");
    assert.ok(tldInd, "Must flag suspicious TLD");
  });

  test("detects deep subdomain obfuscation (> 4 parts)", () => {
    const res = HeuristicEngine.analyze("https://login.verify.account.update.evil.com/session");
    const subInd = res.top_indicators.find((i) => i.feature === "deep_subdomain_structure");
    assert.ok(subInd, "Must flag deep subdomain obfuscation");
  });

  test("detects userinfo '@' symbol deception", () => {
    const res = HeuristicEngine.analyze("http://paypal.com@attacker-site.com/login");
    const atInd = res.top_indicators.find((i) => i.feature === "userinfo_at_symbol");
    assert.ok(atInd, "Must flag @ symbol in URL authority");
  });

  test("detects punycode homoglyph attacks (xn--)", () => {
    const res = HeuristicEngine.analyze("https://xn--pple-43d.com/login");
    const punyInd = res.top_indicators.find((i) => i.feature === "punycode_homograph");
    assert.ok(punyInd, "Must flag punycode homograph");
  });

  test("evaluates standard benign URL as Low Risk", () => {
    const res = HeuristicEngine.analyze("https://en.wikipedia.org/wiki/Phishing");
    assert.strictEqual(res.risk_level, "Low");
    assert.strictEqual(res.is_phishing, false);
    assert.ok(res.risk_score < 0.30);
  });
});
