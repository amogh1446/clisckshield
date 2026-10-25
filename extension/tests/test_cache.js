/**
 * URL Cache and Deduplication Unit Tests
 */

const { test, describe } = require("node:test");
const assert = require("node:assert");
const { UrlCache } = require("../core/cache.js");

describe("UrlCache — Caching & Deduplication", () => {
  test("stores and retrieves cached evaluations", () => {
    const cache = new UrlCache({ ttlMs: 10000 });
    const payload = { risk_level: "High", risk_score: 0.88, is_phishing: true };

    cache.set("https://example.com/phish", payload);
    const retrieved = cache.get("https://example.com/phish");

    assert.deepStrictEqual(retrieved, payload);
  });

  test("normalizes URL keys to match variations", () => {
    const cache = new UrlCache({ ttlMs: 10000 });
    const payload = { risk_level: "Low", risk_score: 0.1 };

    cache.set("https://EXAMPLE.COM/about/", payload);
    const retrieved = cache.get("https://example.com/about");

    assert.deepStrictEqual(retrieved, payload);
  });

  test("expires entries after TTL", async () => {
    const cache = new UrlCache({ ttlMs: 50 }); // 50ms TTL
    cache.set("https://expiring-site.com", { risk_level: "Low" });

    assert.ok(cache.get("https://expiring-site.com") !== null);

    await new Promise((r) => setTimeout(r, 70));
    assert.strictEqual(cache.get("https://expiring-site.com"), null);
  });

  test("evicts oldest entries when capacity is exceeded (LRU)", () => {
    const cache = new UrlCache({ maxEntries: 2 });
    cache.set("https://site1.com", { id: 1 });
    cache.set("https://site2.com", { id: 2 });
    cache.set("https://site3.com", { id: 3 }); // Evicts site1

    assert.strictEqual(cache.get("https://site1.com"), null);
    assert.ok(cache.get("https://site2.com") !== null);
    assert.ok(cache.get("https://site3.com") !== null);
  });

  test("manages in-flight request deduplication promises", () => {
    const cache = new UrlCache();
    const testPromise = Promise.resolve({ ok: true });

    cache.setInFlight("https://duplicate-check.com", testPromise);
    assert.strictEqual(cache.getInFlight("https://duplicate-check.com"), testPromise);

    cache.clearInFlight("https://duplicate-check.com");
    assert.strictEqual(cache.getInFlight("https://duplicate-check.com"), null);
  });

  test("records and tracks session-level user bypasses", () => {
    const cache = new UrlCache();
    assert.strictEqual(cache.isBypassed("https://bypass-site.com"), false);

    cache.recordBypass("https://bypass-site.com");
    assert.strictEqual(cache.isBypassed("https://bypass-site.com"), true);
    assert.strictEqual(cache.isBypassed("https://BYPASS-SITE.COM/"), true);
  });
});
