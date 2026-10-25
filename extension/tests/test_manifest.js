/**
 * Manifest V3 Specification & File Integrity Test
 */

const { test, describe } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

describe("Manifest V3 Integrity", () => {
  const extDir = path.resolve(__dirname, "..");
  const manifestPath = path.join(extDir, "manifest.json");

  test("manifest.json exists and is valid JSON", () => {
    assert.ok(fs.existsSync(manifestPath), "manifest.json must exist");
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw);
    assert.strictEqual(manifest.manifest_version, 3, "Must use Manifest V3");
    assert.ok(manifest.name.includes("ClickShield"), "Must include ClickShield name");
    assert.ok(manifest.version, "Must declare version");
  });

  test("all referenced icon files exist with proper dimensions", () => {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw);

    assert.ok(manifest.icons, "Icons map must be defined");
    for (const [size, iconPath] of Object.entries(manifest.icons)) {
      const fullPath = path.join(extDir, iconPath);
      assert.ok(fs.existsSync(fullPath), `Icon file ${iconPath} for size ${size} must exist`);
      const stat = fs.statSync(fullPath);
      assert.ok(stat.size > 50, `Icon file ${iconPath} must not be empty`);
    }
  });

  test("background service worker file exists and is declared correctly", () => {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw);
    assert.ok(manifest.background?.service_worker, "Service worker must be declared");

    const swPath = path.join(extDir, manifest.background.service_worker);
    assert.ok(fs.existsSync(swPath), `Service worker ${manifest.background.service_worker} must exist`);
  });

  test("content script file exists and has correct match patterns", () => {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw);
    assert.ok(Array.isArray(manifest.content_scripts), "content_scripts must be an array");

    const cs = manifest.content_scripts[0];
    assert.ok(cs.js.length > 0, "At least one content script must be registered");
    const csPath = path.join(extDir, cs.js[0]);
    assert.ok(fs.existsSync(csPath), `Content script ${cs.js[0]} must exist`);
    assert.ok(cs.matches.includes("http://*/*"), "Must match http");
    assert.ok(cs.matches.includes("https://*/*"), "Must match https");
  });

  test("popup HTML, CSS and JS files exist", () => {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw);
    const popupHtml = manifest.action?.default_popup;
    assert.ok(popupHtml, "action.default_popup must be defined");

    const htmlPath = path.join(extDir, popupHtml);
    assert.ok(fs.existsSync(htmlPath), "popup.html must exist");

    const cssPath = path.join(extDir, "popup", "popup.css");
    assert.ok(fs.existsSync(cssPath), "popup.css must exist");

    const jsPath = path.join(extDir, "popup", "popup.js");
    assert.ok(fs.existsSync(jsPath), "popup.js must exist");
  });

  test("warning interstitial HTML, CSS and JS files exist", () => {
    const htmlPath = path.join(extDir, "warning", "warning.html");
    const cssPath = path.join(extDir, "warning", "warning.css");
    const jsPath = path.join(extDir, "warning", "warning.js");

    assert.ok(fs.existsSync(htmlPath), "warning.html must exist");
    assert.ok(fs.existsSync(cssPath), "warning.css must exist");
    assert.ok(fs.existsSync(jsPath), "warning.js must exist");
  });

  test("permissions are minimal and valid for Manifest V3", () => {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw);

    const allowedPermissions = new Set(["storage", "activeTab", "tabs", "webNavigation"]);
    for (const perm of manifest.permissions) {
      assert.ok(allowedPermissions.has(perm), `Permission ${perm} should be expected`);
    }
  });
});
