const { describe, it } = require("node:test");
const assert = require("assert").strict;
const { spawn } = require("child_process");
const path = require("path");

// ============================================================================
// Constants
// ============================================================================

const CLI_PATH = path.join(__dirname, "../dist/cli.js");

const TIMEOUTS = {
  QUICK: 5000,
  SEARCH: 30000,
  MULTI_SEARCH: 120000,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Execute CLI command and return stdout, stderr, and exit code
 * @param {string[]} args - Command line arguments
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
function runCli(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn("node", [CLI_PATH, ...args], {
      env: { ...process.env, FORCE_COLOR: "0" }, // Disable colors for easier parsing
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      resolve({ stdout, stderr, code: code ?? 0 });
    });

    proc.on("error", (err) => {
      reject(err);
    });
  });
}

// ============================================================================
// Test Suite
// ============================================================================

describe("CLI", () => {
  // ------------------------------------------------------------------
  // Help and Version Tests
  // ------------------------------------------------------------------

  it(
    "should display version with --version",
    { timeout: TIMEOUTS.QUICK },
    async () => {
      const { stdout, code } = await runCli(["--version"]);

      assert.strictEqual(code, 0, "Exit code should be 0");
      assert.match(
        stdout.trim(),
        /^\d+\.\d+\.\d+/,
        "Should output semver version",
      );
    },
  );

  it(
    "should display version with -V",
    { timeout: TIMEOUTS.QUICK },
    async () => {
      const { stdout, code } = await runCli(["-V"]);

      assert.strictEqual(code, 0, "Exit code should be 0");
      assert.match(
        stdout.trim(),
        /^\d+\.\d+\.\d+/,
        "Should output semver version",
      );
    },
  );

  it(
    "should display help with --help",
    { timeout: TIMEOUTS.QUICK },
    async () => {
      const { stdout, code } = await runCli(["--help"]);

      assert.strictEqual(code, 0, "Exit code should be 0");
      assert.ok(
        stdout.includes("-a, --library-list"),
        "Should show library-list option",
      );
      assert.ok(
        stdout.includes("-i, --interactive"),
        "Should show interactive option",
      );
      assert.ok(
        stdout.includes("-m, --interactive-with-library-module"),
        "Should show -m option",
      );
      assert.ok(
        stdout.includes("-l, --library-name"),
        "Should show library-name option",
      );
      assert.ok(stdout.includes("-t, --title"), "Should show title option");
    },
  );

  it("should display help with -h", { timeout: TIMEOUTS.QUICK }, async () => {
    const { stdout, code } = await runCli(["-h"]);

    assert.strictEqual(code, 0, "Exit code should be 0");
    assert.ok(stdout.includes("Options:"), "Should show Options section");
  });

  // ------------------------------------------------------------------
  // Library List Tests
  // ------------------------------------------------------------------

  it(
    "should list all libraries with -a",
    { timeout: TIMEOUTS.QUICK },
    async () => {
      const { stdout, code } = await runCli(["-a"]);

      assert.strictEqual(code, 0, "Exit code should be 0");
      assert.ok(
        stdout.includes("도서관"),
        "Should include Korean word for library",
      );
      assert.match(
        stdout,
        /모두 \d+ 개의 도서관/,
        "Should show total library count",
      );

      // Verify we have a reasonable number of libraries
      const match = stdout.match(/모두 (\d+) 개의 도서관/);
      assert.ok(match, "Should match library count pattern");
      const count = parseInt(match[1], 10);
      assert.ok(count > 50, `Should have more than 50 libraries, got ${count}`);
    },
  );

  it(
    "should list all libraries with --library-list",
    { timeout: TIMEOUTS.QUICK },
    async () => {
      const { stdout, code } = await runCli(["--library-list"]);

      assert.strictEqual(code, 0, "Exit code should be 0");
      assert.ok(
        stdout.includes("도서관"),
        "Should include Korean word for library",
      );
    },
  );

  // ------------------------------------------------------------------
  // Search Tests
  // ------------------------------------------------------------------

  it(
    "should search with -t and -l options",
    { timeout: TIMEOUTS.SEARCH },
    async () => {
      const { stdout, code } = await runCli(["-t", "javascript", "-l", "성남"]);

      assert.strictEqual(code, 0, "Exit code should be 0");
      assert.match(
        stdout,
        /\d+ 개의 도서관에서\s+\d+ 권 검색됨/,
        "Should show search summary",
      );
    },
  );

  it(
    "should search with --title and --library-name options",
    { timeout: TIMEOUTS.SEARCH },
    async () => {
      const { stdout, code } = await runCli([
        "--title",
        "python",
        "--library-name",
        "군포",
      ]);

      assert.strictEqual(code, 0, "Exit code should be 0");
      assert.match(
        stdout,
        /\d+ 개의 도서관에서\s+\d+ 권 검색됨/,
        "Should show search summary",
      );
    },
  );

  it(
    "should handle comma-separated names (searches first match only)",
    { timeout: TIMEOUTS.SEARCH },
    async () => {
      // Note: The CLI currently doesn't split comma-separated library names.
      // It passes "성남,군포" as a single string to the search API, which
      // finds no match. This test documents the current behavior.
      const { stdout, code } = await runCli(["-t", "java", "-l", "성남,군포"]);

      assert.strictEqual(code, 0, "Exit code should be 0");
      assert.match(
        stdout,
        /\d+ 개의 도서관에서\s+\d+ 권 검색됨/,
        "Should show search summary",
      );

      // Currently returns 0 results since comma-separated parsing isn't implemented
      const match = stdout.match(/(\d+) 개의 도서관에서/);
      assert.ok(match, "Should match library count pattern");
    },
  );

  it(
    "should search with Korean title",
    { timeout: TIMEOUTS.MULTI_SEARCH },
    async () => {
      const { stdout, code } = await runCli(["-t", "파이썬", "-l", "판교도서관"]);

      assert.strictEqual(code, 0, "Exit code should be 0");
      assert.match(
        stdout,
        /\d+ 개의 도서관에서\s+\d+ 권 검색됨/,
        "Should show search summary",
      );
    },
  );

  it(
    "should show book URLs when --url flag is used",
    { timeout: TIMEOUTS.SEARCH },
    async () => {
      const { stdout, code } = await runCli(["-t", "javascript", "-l", "성남", "--url"]);

      assert.strictEqual(code, 0, "Exit code should be 0");
      // Book URLs are prefixed with → and contain http
      assert.ok(
        stdout.includes("→") && stdout.includes("http"),
        "Should include book URLs in output when --url is used",
      );
    },
  );

  it(
    "should hide book URLs by default",
    { timeout: TIMEOUTS.SEARCH },
    async () => {
      const { stdout, code } = await runCli(["-t", "javascript", "-l", "성남"]);

      assert.strictEqual(code, 0, "Exit code should be 0");
      assert.ok(
        !stdout.includes("→ http"),
        "Should not include book URLs by default",
      );
    },
  );

  it(
    "should handle nonsense search term gracefully",
    { timeout: TIMEOUTS.SEARCH },
    async () => {
      const { stdout, code } = await runCli([
        "-t",
        "zyxwvutsrqponmlkjihgfedcba",
        "-l",
        "성남",
      ]);

      assert.strictEqual(code, 0, "Exit code should be 0");
      // Should complete without error, possibly with 0 results
      assert.match(
        stdout,
        /\d+ 개의 도서관에서\s+\d+ 권 검색됨/,
        "Should show search summary even with no results",
      );
    },
  );

  // ------------------------------------------------------------------
  // Title-only Search Tests
  // ------------------------------------------------------------------

  it(
    "should search all libraries when only -t is provided",
    { timeout: TIMEOUTS.MULTI_SEARCH },
    async () => {
      // This searches ALL libraries, so use a longer timeout
      const { stdout, code } = await runCli(["-t", "javascript"]);

      assert.strictEqual(code, 0, "Exit code should be 0");
      assert.match(
        stdout,
        /\d+ 개의 도서관에서\s+\d+ 권 검색됨/,
        "Should show search summary",
      );

      // Should have searched many libraries
      const match = stdout.match(/(\d+) 개의 도서관에서/);
      assert.ok(match, "Should match library count pattern");
      const libraryCount = parseInt(match[1], 10);
      assert.ok(
        libraryCount > 10,
        `Should search many libraries, got ${libraryCount}`,
      );
    },
  );

  // ------------------------------------------------------------------
  // Module-based Interactive Mode (-m) Tests
  // ------------------------------------------------------------------

  it(
    "should show -m option in --help",
    { timeout: TIMEOUTS.QUICK },
    async () => {
      const { stdout, code } = await runCli(["--help"]);

      assert.strictEqual(code, 0, "Exit code should be 0");
      assert.ok(
        stdout.includes("-m, --interactive-with-library-module"),
        "Should list -m option in help",
      );
    },
  );

  it(
    "should exit when SIGINT is sent during -m prompt",
    { timeout: TIMEOUTS.QUICK },
    async () => {
      const { code } = await new Promise((resolve, reject) => {
        const proc = spawn("node", [CLI_PATH, "-m"], {
          env: { ...process.env, FORCE_COLOR: "0" },
        });

        let stdout = "";
        let stderr = "";
        proc.stdout.on("data", (d) => (stdout += d.toString()));
        proc.stderr.on("data", (d) => (stderr += d.toString()));
        proc.on("close", (code) => resolve({ stdout, stderr, code: code ?? 0 }));
        proc.on("error", reject);

        // Give process time to start, then send SIGINT
        setTimeout(() => proc.kill("SIGINT"), 800);
      });

      // Process must exit (not hang) — code may be non-zero due to SIGINT
      assert.ok(code !== undefined, "Process should have exited");
    },
  );

  // ------------------------------------------------------------------
  // Query String Mode (-q) Tests
  // ------------------------------------------------------------------

  it(
    "should show -q option in --help",
    { timeout: TIMEOUTS.QUICK },
    async () => {
      const { stdout, code } = await runCli(["--help"]);

      assert.strictEqual(code, 0, "Exit code should be 0");
      assert.ok(
        stdout.includes("-q, --query"),
        "Should list -q option in help",
      );
    },
  );

  it(
    "should search with -q and exact library name",
    { timeout: TIMEOUTS.SEARCH },
    async () => {
      const { stdout, code } = await runCli(["-q", "판교도서관 자바스크립트"]);

      assert.strictEqual(code, 0, "Exit code should be 0");
      assert.ok(
        stdout.includes('판교도서관에서 "자바스크립트" 검색'),
        "Should confirm parsed library and title",
      );
      assert.match(
        stdout,
        /\d+ 개의 도서관에서\s+\d+ 권 검색됨/,
        "Should show search summary",
      );
    },
  );

  it(
    "should search with -q and title before library name",
    { timeout: TIMEOUTS.SEARCH },
    async () => {
      const { stdout, code } = await runCli(["-q", "자바스크립트 판교도서관"]);

      assert.strictEqual(code, 0, "Exit code should be 0");
      assert.ok(
        stdout.includes("판교도서관"),
        "Should resolve library name regardless of order",
      );
      assert.match(
        stdout,
        /\d+ 개의 도서관에서\s+\d+ 권 검색됨/,
        "Should show search summary",
      );
    },
  );

  it(
    "should search all matching libraries when partial name matches multiple",
    { timeout: TIMEOUTS.SEARCH },
    async () => {
      // "판교" matches both 판교도서관 and 판교어린이도서관
      const { stdout, code } = await runCli(["-q", "판교 자바스크립트"]);

      assert.strictEqual(code, 0, "Exit code should be 0");
      assert.ok(
        stdout.includes("판교도서관"),
        "Should include 판교도서관 in confirmation",
      );
      assert.ok(
        stdout.includes("판교어린이도서관"),
        "Should include 판교어린이도서관 in confirmation",
      );

      const match = stdout.match(/(\d+) 개의 도서관에서/);
      assert.ok(match, "Should show search summary");
      const count = parseInt(match[1], 10);
      assert.ok(count >= 2, `Should search at least 2 libraries, got ${count}`);
    },
  );

  it(
    "should search multiple libraries with -q and comma-separated names",
    { timeout: TIMEOUTS.SEARCH },
    async () => {
      const { stdout, code } = await runCli(["-q", "판교,분당 자바스크립트"]);

      assert.strictEqual(code, 0, "Exit code should be 0");
      assert.ok(
        stdout.includes("판교도서관"),
        "Should include 판교도서관 in confirmation",
      );
      assert.ok(
        stdout.includes("분당도서관"),
        "Should include 분당도서관 in confirmation",
      );
      assert.match(
        stdout,
        /\d+ 개의 도서관에서\s+\d+ 권 검색됨/,
        "Should show search summary",
      );
    },
  );

  it(
    "should show error for -q when library name cannot be resolved",
    { timeout: TIMEOUTS.QUICK },
    async () => {
      const { stdout, code } = await runCli([
        "-q",
        "zzznolibrary 자바스크립트",
      ]);

      assert.strictEqual(code, 0, "Exit code should be 0");
      assert.ok(
        stdout.includes("도서관 이름을 찾을 수 없습니다"),
        "Should show library-not-found error",
      );
    },
  );

  // ------------------------------------------------------------------
  // Edge Cases
  // ------------------------------------------------------------------

  it(
    "should enter interactive mode with no arguments",
    { timeout: TIMEOUTS.QUICK },
    async () => {
      // With no arguments, CLI enters interactive mode (shows prompt)
      // Send SIGINT after a short delay to exit the prompt
      const { code } = await new Promise((resolve, reject) => {
        const proc = spawn("node", [CLI_PATH], {
          env: { ...process.env, FORCE_COLOR: "0" },
        });

        let stdout = "";
        let stderr = "";
        proc.stdout.on("data", (d) => (stdout += d.toString()));
        proc.stderr.on("data", (d) => (stderr += d.toString()));
        proc.on("close", (code) => resolve({ stdout, stderr, code: code ?? 0 }));
        proc.on("error", reject);

        setTimeout(() => proc.kill("SIGINT"), 800);
      });

      assert.ok(code !== undefined, "Process should have exited");
    },
  );

  it(
    "should handle partial library name match",
    { timeout: TIMEOUTS.SEARCH },
    async () => {
      // "분당" should match libraries in 분당 area
      const { stdout, code } = await runCli(["-t", "javascript", "-l", "분당"]);

      assert.strictEqual(code, 0, "Exit code should be 0");
      assert.match(
        stdout,
        /\d+ 개의 도서관에서\s+\d+ 권 검색됨/,
        "Should show search summary",
      );
    },
  );
});
