/**
 * ClickShield URL & Threat Cache
 *
 * Prevents redundant network requests, provides in-flight request deduplication,
 * manages TTL (5 minutes), and handles temporary session bypasses.
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ClickShieldCache = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  class UrlCache {
    /**
     * @param {Object} options
     * @param {number} [options.ttlMs=300000] - 5 minutes default TTL
     * @param {number} [options.maxEntries=100] - Maximum cache capacity
     */
    constructor(options = {}) {
      this.ttlMs = options.ttlMs || 300000;
      this.maxEntries = options.maxEntries || 100;
      this.cache = new Map(); // url -> { data, expiresAt }
      this.inFlight = new Map(); // url -> Promise
      this.bypassedUrls = new Set(); // Session-level approved destinations
    }

    /**
     * Normalizes cache key.
     * @param {string} url
     * @returns {string}
     */
    _normalize(url) {
      if (!url || typeof url !== "string") return "";
      try {
        const u = new URL(url.trim());
        let norm = `${u.protocol}//${u.hostname.toLowerCase()}`;
        if (u.port && u.port !== "80" && u.port !== "443") norm += `:${u.port}`;
        norm += u.pathname.replace(/\/+$/, "") || "/";
        if (u.search) norm += u.search;
        return norm;
      } catch {
        return url.trim().toLowerCase();
      }
    }

    /**
     * Retrieves cached result if still valid.
     * @param {string} url
     * @returns {Object|null}
     */
    get(url) {
      const key = this._normalize(url);
      if (!this.cache.has(key)) return null;

      const entry = this.cache.get(key);
      if (Date.now() > entry.expiresAt) {
        this.cache.delete(key);
        return null;
      }

      // Re-insert to mark as recently used (LRU)
      this.cache.delete(key);
      this.cache.set(key, entry);
      return entry.data;
    }

    /**
     * Stores analysis result in cache with TTL.
     * @param {string} url
     * @param {Object} data
     * @param {number} [customTtlMs]
     */
    set(url, data, customTtlMs) {
      const key = this._normalize(url);
      if (!key) return;

      const ttl = customTtlMs || this.ttlMs;
      const expiresAt = Date.now() + ttl;

      // LRU eviction if full
      if (this.cache.size >= this.maxEntries) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey) this.cache.delete(oldestKey);
      }

      this.cache.set(key, { data, expiresAt });
    }

    /**
     * Checks if URL exists and is still valid in cache.
     * @param {string} url
     * @returns {boolean}
     */
    has(url) {
      return this.get(url) !== null;
    }

    /**
     * Deduplication: gets pending in-flight promise.
     * @param {string} url
     * @returns {Promise|null}
     */
    getInFlight(url) {
      const key = this._normalize(url);
      return this.inFlight.get(key) || null;
    }

    /**
     * Deduplication: stores pending in-flight promise.
     * @param {string} url
     * @param {Promise} promise
     */
    setInFlight(url, promise) {
      const key = this._normalize(url);
      this.inFlight.set(key, promise);
    }

    /**
     * Clears pending in-flight promise once resolved/rejected.
     * @param {string} url
     */
    clearInFlight(url) {
      const key = this._normalize(url);
      this.inFlight.delete(key);
    }

    /**
     * Records a user override / proceed-anyway bypass for current browser session.
     * @param {string} url
     */
    recordBypass(url) {
      const key = this._normalize(url);
      if (key) this.bypassedUrls.add(key);
    }

    /**
     * Checks if destination URL was temporarily bypassed by user.
     * @param {string} url
     * @returns {boolean}
     */
    isBypassed(url) {
      const key = this._normalize(url);
      return this.bypassedUrls.has(key);
    }

    /**
     * Clears all cache entries.
     */
    clear() {
      this.cache.clear();
      this.inFlight.clear();
      this.bypassedUrls.clear();
    }
  }

  return { UrlCache };
});
