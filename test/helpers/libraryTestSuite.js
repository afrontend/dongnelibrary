const { describe, it } = require("node:test");
const assert = require("assert").strict;
const path = require("path");
const { request } = require("undici");
const util = require("../../dist/util.js");
const { startCapture } = require("./httpRecorder");
const { classifyError, classifyEmpty, saveFailure } = require("./diagnose");
const { getSearchTerms } = require("./searchTerms");

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const TIMEOUTS = {
  DEFAULT: 20000,
  NETWORK: 30000,
  MULTI_SEARCH: 80000,
};

const ERROR_MESSAGES = {
  NEED_BOOK_NAME: "Need a book name",
  NEED_LIBRARY_NAME: "Need a library name",
};

const KOREAN_ERROR_PAGE_INDICATORS = [
  "페이지를 찾을 수 없습니다",
  "존재하지 않는 페이지",
  "잘못된 접근",
  "요청하신 페이지를 찾을 수 없습니다",
];

const SESSION_REQUIRED_DOMAINS = [
  "alpasq.bcl.go.kr",
  "kolas.cheonan.go.kr",
  "lib.ansan.go.kr",
  "lib.gangseo.seoul.kr",
  "lib.geoje.go.kr",
  "lib.goe.go.kr",
  "lib.siheung.go.kr",
  "lib.wanju.go.kr",
  "hnrl.michu.incheon.kr",
  "search.suwonlib.go.kr",
  "www.nowonlib.kr",
  "www.yplib.go.kr",
  "yspubliclib.go.kr",
];

const KOREAN_TEST_TITLES = ["별", "자바", "소설"];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extracts the base domain (last two parts) from a URL
 * @param {string} url - The URL to extract domain from
 * @returns {string|null} The base domain or null if invalid
 */
function getBaseDomain(url) {
  try {
    const hostname = new URL(url.split("#")[0]).hostname;
    const parts = hostname.split(".");
    return parts.slice(-2).join(".");
  } catch {
    return null;
  }
}

/**
 * Wraps library search in a Promise for async/await usage
 * @param {object} lib - The library module
 * @param {object} options - Search options (title, libraryName, startPage)
 * @returns {Promise<object>} Search result with booklist
 */
function searchAsync(lib, options) {
  return new Promise((resolve, reject) => {
    lib.search(options, (err, result) => {
      if (err) reject(new Error(err.msg));
      else resolve(result);
    });
  });
}

/**
 * Checks if a URL uses hash-based client-side routing
 * @param {string} url - The URL to check
 * @returns {boolean} True if URL is hash-based
 */
function isHashBasedUrl(url) {
  const urlWithoutHash = url.split("#")[0];
  return urlWithoutHash !== url && !urlWithoutHash.includes("?");
}

// ============================================================================
// Test Suite Factory
// ============================================================================

/**
 * Creates a standard test suite for library modules.
 * Tests validation, search functionality, URL formats, and multi-library searches.
 *
 * @param {object} lib - The library module (must export search, getLibraryNames, homeUrl)
 * @param {string} description - The describe block name (e.g., "경기교육도서관")
 * @param {object} [options] - Optional overrides
 * @param {string} [options.englishSearchTerm] - Override the first search term candidate
 *   (useful for servers that WAF-block the word "javascript")
 * @param {string[]} [options.searchTerms] - Replace all search term candidates
 */
function createLibraryTestSuite(lib, description, options = {}) {
  const libraryNames = lib.getLibraryNames();
  const firstLibraryName = libraryNames[0];
  const searchTerms = getSearchTerms(options);
  const englishSearchTerm = searchTerms[0];
  const moduleKey = path.basename(process.argv[1] ?? description, ".spec.js");

  /**
   * Helper to create search options with defaults
   */
  const createSearchOptions = (title, libraryName = firstLibraryName) => ({
    title,
    libraryName,
    startPage: 1,
  });

  /**
   * 검색어 후보를 차례로 시도해 책이 나오는 첫 검색 결과를 찾는다.
   * 한 번만 실행하고 이후 테스트는 결과를 재사용한다 (사이트 요청 수를 줄인다).
   * @returns {Promise<{term: string, result: object} | {failure: string}>}
   */
  let searchablePromise;
  const findSearchableBooks = () => {
    searchablePromise ??= (async () => {
      const tried = [];
      for (const term of searchTerms) {
        const capture = startCapture();
        try {
          const result = await searchAsync(lib, createSearchOptions(term));
          const exchanges = capture.stop();
          if (result.booklist.length > 0) return { term, result };
          tried.push({ term, reason: classifyEmpty(result, exchanges), exchanges });
        } catch (err) {
          // 에러는 검색어와 무관하므로 다른 후보를 시도하지 않는다.
          tried.push({ term, reason: classifyError(err.message), exchanges: capture.stop() });
          break;
        }
      }

      const lines = tried.map(({ term, reason, exchanges }) => {
        const saved = saveFailure(moduleKey, `search-${term}`, exchanges);
        return `  "${term}": ${reason}${saved ? ` (응답: ${saved})` : ""}`;
      });
      return {
        failure: `${firstLibraryName} 에서 책을 찾지 못함\n${lines.join("\n")}`,
      };
    })();
    return searchablePromise;
  };

  const requireSearchableBooks = async ({ brief = false } = {}) => {
    const found = await findSearchableBooks();
    assert.ok(
      !found.failure,
      brief ? '검색 결과 없음 — "Show the book list" 의 진단 참고' : found.failure,
    );
    return found;
  };

  describe(`${description}`, () => {
    // ------------------------------------------------------------------
    // Validation Tests
    // ------------------------------------------------------------------

    it("Show library list", { timeout: TIMEOUTS.DEFAULT }, () => {
      assert.ok(libraryNames.length > 1, "Should have more than one library");
    });

    it("Use empty book title", { timeout: TIMEOUTS.DEFAULT }, () => {
      return new Promise((resolve) => {
        lib.search(createSearchOptions(""), (err) => {
          assert.ok(err, "Should return an error for empty title");
          assert.strictEqual(err.msg, ERROR_MESSAGES.NEED_BOOK_NAME);
          resolve();
        });
      });
    });

    it("Use invalid book title", { timeout: TIMEOUTS.DEFAULT }, () => {
      return new Promise((resolve) => {
        const nonsenseTitle =
          "zyxwvutsrqponmlkjihgfedcbaabcdefghijklmnopqrstuvwxyz";
        const capture = startCapture();
        lib.search(createSearchOptions(nonsenseTitle), (err, result) => {
          const exchanges = capture.stop();
          if (err) {
            const saved = saveFailure(moduleKey, "invalid-title", exchanges);
            assert.fail(
              `Should not return error for nonsense title: ${classifyError(err.msg)}` +
                (saved ? ` (응답: ${saved})` : ""),
            );
          }
          assert.strictEqual(
            result.booklist.length,
            0,
            "Should return empty booklist",
          );
          resolve();
        });
      });
    });

    it("Use empty library name", { timeout: TIMEOUTS.DEFAULT }, () => {
      return new Promise((resolve) => {
        lib.search(createSearchOptions(englishSearchTerm, ""), (err, result) => {
          assert.ok(err, "Should return an error for empty library name");
          assert.strictEqual(err.msg, ERROR_MESSAGES.NEED_LIBRARY_NAME);
          assert.strictEqual(
            result,
            undefined,
            "Should not return result on error",
          );
          resolve();
        });
      });
    });

    // ------------------------------------------------------------------
    // Basic Search Tests
    // ------------------------------------------------------------------

    it(
      `Show the book list of a library (${searchTerms.join(" → ")})`,
      { timeout: TIMEOUTS.MULTI_SEARCH },
      async () => {
        const { term, result } = await requireSearchableBooks();
        console.log(`  ✓ "${term}" 로 검색`);
        util.printTotalBookCount(result);
      },
    );

    // ------------------------------------------------------------------
    // URL Validation Tests
    // ------------------------------------------------------------------

    it(
      "Verify bookUrl format is valid",
      { timeout: TIMEOUTS.NETWORK },
      async () => {
        const { result: searchResult } = await requireSearchableBooks({ brief: true });

        assert.ok(
          searchResult.booklist.length > 0,
          "Need at least one book to test bookUrl",
        );

        const bookWithUrl = searchResult.booklist.find((b) => b.bookUrl);
        assert.ok(bookWithUrl, "At least one book should have a bookUrl");

        const { bookUrl } = bookWithUrl;

        // Verify URL protocol
        const hasValidProtocol =
          bookUrl.startsWith("http://") || bookUrl.startsWith("https://");
        assert.ok(
          hasValidProtocol,
          `bookUrl should start with http:// or https://: ${bookUrl}`,
        );

        // Verify domain matches library's home URL
        const homeBaseDomain = getBaseDomain(lib.homeUrl);
        const bookBaseDomain = getBaseDomain(bookUrl);
        assert.ok(
          homeBaseDomain && bookBaseDomain && homeBaseDomain === bookBaseDomain,
          `bookUrl domain (${bookBaseDomain}) should match homeUrl domain (${homeBaseDomain}): ${bookUrl}`,
        );

        // Verify URL is parseable (excluding hash fragment)
        const urlWithoutHash = bookUrl.split("#")[0];
        try {
          new URL(urlWithoutHash);
        } catch {
          assert.fail(`bookUrl base is not a valid URL: ${bookUrl}`);
        }

        console.log(`  ✓ bookUrl format verified: ${bookUrl}`);
      },
    );

    it(
      "Verify bookUrl is accessible",
      { timeout: TIMEOUTS.NETWORK },
      async () => {
        const { result: searchResult } = await requireSearchableBooks({ brief: true });

        assert.ok(
          searchResult.booklist.length > 0,
          "Need at least one book to test bookUrl accessibility",
        );

        const bookWithUrl = searchResult.booklist.find((b) => b.bookUrl);
        assert.ok(bookWithUrl, "At least one book should have a bookUrl");

        const { bookUrl } = bookWithUrl;

        // Skip hash-only URLs (e.g., gunpo uses client-side routing)
        if (isHashBasedUrl(bookUrl)) {
          console.log(
            `  ⊘ Skipping accessibility check for hash-based URL: ${bookUrl}`,
          );
          return;
        }

        const urlObj = new URL(bookUrl);

        // Skip domains that require session-based access
        if (SESSION_REQUIRED_DOMAINS.includes(urlObj.hostname)) {
          console.log(
            `  ⊘ Skipping accessibility check (session required): ${bookUrl}`,
          );
          return;
        }

        try {
          const response = await request(bookUrl, {
            method: "GET",
            maxRedirections: 5,
            headersTimeout: TIMEOUTS.DEFAULT,
            bodyTimeout: TIMEOUTS.DEFAULT,
            headers: {
              "User-Agent": DEFAULT_USER_AGENT,
              Referer: `${urlObj.origin}/`,
            },
          });

          const body = await response.body.text();

          // Verify HTTP status is successful
          assert.ok(
            response.statusCode < 400,
            `bookUrl returns error status ${response.statusCode}: ${bookUrl}`,
          );

          // Check for soft 404 (error page with 200 status)
          const isSoft404 = KOREAN_ERROR_PAGE_INDICATORS.some((indicator) =>
            body.includes(indicator),
          );
          assert.ok(
            !isSoft404,
            `bookUrl appears to be a soft 404 (error page content detected): ${bookUrl}`,
          );

          console.log(
            `  ✓ bookUrl is accessible (status ${response.statusCode}): ${bookUrl}`,
          );
        } catch (error) {
          // Re-throw assertion errors
          if (error.code === "ERR_ASSERTION") {
            throw error;
          }
          assert.fail(
            `bookUrl is not accessible (network error: ${error.message}): ${bookUrl}`,
          );
        }
      },
    );

    it(
      "Verify bookUrl page contains book title",
      { timeout: TIMEOUTS.NETWORK },
      async () => {
        const { result: searchResult } = await requireSearchableBooks({ brief: true });

        assert.ok(
          searchResult.booklist.length > 0,
          "Need at least one book to test bookUrl content",
        );

        const bookWithUrl = searchResult.booklist.find(
          (b) => b.bookUrl && b.title,
        );
        assert.ok(bookWithUrl, "At least one book should have bookUrl and title");

        const { bookUrl, title } = bookWithUrl;

        // Skip hash-based URLs (client-side routing)
        if (isHashBasedUrl(bookUrl)) {
          console.log(
            `  ⊘ Skipping title check for hash-based URL: ${bookUrl}`,
          );
          return;
        }

        const urlObj = new URL(bookUrl);

        // Skip domains that require session-based access
        if (SESSION_REQUIRED_DOMAINS.includes(urlObj.hostname)) {
          console.log(
            `  ⊘ Skipping title check (session required): ${bookUrl}`,
          );
          return;
        }

        try {
          const response = await request(bookUrl, {
            method: "GET",
            maxRedirections: 5,
            headersTimeout: TIMEOUTS.DEFAULT,
            bodyTimeout: TIMEOUTS.DEFAULT,
            headers: {
              "User-Agent": DEFAULT_USER_AGENT,
              Referer: `${urlObj.origin}/`,
            },
          });

          const body = await response.body.text();

          // Extract first few words from title for partial matching
          // (handles cases where page shows slightly different formatting)
          const titleWords = title.split(/\s+/).slice(0, 3).join(" ");
          const hasTitle = body.includes(title) || body.includes(titleWords);

          assert.ok(
            hasTitle,
            `bookUrl page should contain book title "${title}": ${bookUrl}`,
          );

          console.log(`  ✓ bookUrl page contains title "${title}": ${bookUrl}`);
        } catch (error) {
          if (error.code === "ERR_ASSERTION") {
            throw error;
          }
          assert.fail(
            `bookUrl title check failed (network error: ${error.message}): ${bookUrl}`,
          );
        }
      },
    );

    // ------------------------------------------------------------------
    // Korean Language Tests
    // ------------------------------------------------------------------

    it(
      `Search with Korean titles (${KOREAN_TEST_TITLES.join(", ")})`,
      { timeout: TIMEOUTS.MULTI_SEARCH },
      async () => {
        const results = [];

        for (const title of KOREAN_TEST_TITLES) {
          try {
            const searchResult = await searchAsync(
              lib,
              createSearchOptions(title),
            );
            const count = searchResult.booklist?.length || 0;
            const success = count > 0;

            results.push({ title, count, success });
            console.log(
              success
                ? `  ✓ "${title}": ${count} books found`
                : `  - "${title}": 0 books found`,
            );
          } catch (err) {
            results.push({
              title,
              count: 0,
              success: false,
              error: err.message,
            });
            console.log(`  ✗ "${title}": ${err.message}`);
          }
        }

        const anySuccess = results.some((r) => r.success);
        const summary = results
          .map((r) => `"${r.title}"(${r.count})`)
          .join(", ");
        assert.ok(
          anySuccess,
          `At least one Korean title should return results. Tried: ${summary}`,
        );
      },
    );

    // ------------------------------------------------------------------
    // Multi-Library Search Test
    // ------------------------------------------------------------------

    it(
      "Make sure the book is searchable in each library",
      { timeout: TIMEOUTS.MULTI_SEARCH },
      async () => {
        const found = await findSearchableBooks();
        const term = found.term ?? englishSearchTerm;
        const outcomes = await Promise.all(
          libraryNames.map((libraryName) =>
            searchAsync(lib, createSearchOptions(term, libraryName)).then(
              (result) => ({ libraryName, result }),
              (error) => ({ libraryName, error }),
            ),
          ),
        );

        let successCount = 0;
        const failedLibraries = [];
        for (const { libraryName, result, error } of outcomes) {
          if (error) {
            console.log(`  ✗ ${libraryName}: ${error.message}`);
            failedLibraries.push(`${libraryName}: ${classifyError(error.message)}`);
            continue;
          }
          assert.ok(
            result.booklist !== undefined,
            `${libraryName} should return a booklist`,
          );
          if (result.totalBookCount > 0) {
            console.log(`  ✓ ${libraryName}: ${result.totalBookCount} books found`);
            successCount++;
          } else {
            console.log(
              `  - ${libraryName}: 0 books found (may be expected for small collections)`,
            );
          }
        }

        console.log(
          `  Summary: ${successCount} libraries with results, ${failedLibraries.length} errors`,
        );
        assert.ok(
          failedLibraries.length < libraryNames.length,
          `At least one library should be searchable\n  ${failedLibraries.slice(0, 3).join("\n  ")}`,
        );
        assert.ok(successCount > 0, "At least one library should return results");
      },
    );
  });
}

// ============================================================================
// Exports
// ============================================================================

module.exports = { createLibraryTestSuite };
