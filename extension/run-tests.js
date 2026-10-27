/**
 * ClickShield Automated Test Runner
 * Discovers and runs all test suites under extension/tests/ using Node.js built-in test runner.
 */

const { readdirSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

const testsDir = join(__dirname, "tests");
const testFiles = readdirSync(testsDir)
  .filter((f) => f.startsWith("test_") && f.endsWith(".js"))
  .map((f) => join(testsDir, f));

console.log(`[ClickShield Test Runner] Running ${testFiles.length} test suites...\n`);

const result = spawnSync(process.execPath, ["--test", ...testFiles], {
  stdio: "inherit",
});

process.exit(result.status || 0);
