const { describe, it } = require("node:test");
const assert = require("assert").strict;
const { request } = require("undici");
const util = require("../../src/util.js");

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Creates a standard test suite for library modules that use libraryNames[0]
 * @param {object} lib - The library module
 * @param {string} description - The describe block name (e.g., "경기교육도서관")
 */
function createLibraryTestSuite(lib, description) {
  const libraryNames = lib.getLibraryNames();
  const firstLibraryName = libraryNames[0];

  describe(`${description} (제한시간 20초)`, () => {
    it("Show library list", { timeout: 20000 }, () => {
      assert.ok(libraryNames.length > 1);
    });

    it("Use empty book title", { timeout: 20000 }, () => {
      return new Promise((resolve) => {
        lib.search(
          {
            title: "",
            libraryName: firstLibraryName,
            startPage: 1,
          },
          (err) => {
            if (err) {
              assert.ok(err.msg === "Need a book name");
            } else {
              assert.fail("Need a error msg");
            }
            resolve();
          },
        );
      });
    });

    it("Use invalid book title", { timeout: 20000 }, () => {
      return new Promise((resolve) => {
        lib.search(
          {
            title: "zyxwvutsrqponmlkjihgfedcbaabcdefghijklmnopqrstuvwxyz",
            libraryName: firstLibraryName,
            startPage: 1,
          },
          (err, book) => {
            if (err) {
              assert.fail("must have an empty booklist");
            }
            assert.equal(book.booklist.length, 0);
            resolve();
          },
        );
      });
    });

    it("Use empty library name", { timeout: 20000 }, () => {
      return new Promise((resolve) => {
        lib.search(
          {
            title: "javascript",
            libraryName: "",
            startPage: 1,
          },
          (err, book) => {
            if (err) {
              assert.ok(err.msg === "Need a library name");
            }
            assert.equal(book, undefined);
            resolve();
          },
        );
      });
    });

    it("Show the book list of a library", { timeout: 20000 }, () => {
      return new Promise((resolve) => {
        lib.search(
          {
            title: "javascript",
            libraryName: firstLibraryName,
            startPage: 1,
          },
          (err, book) => {
            if (err) {
              assert.fail(err.msg);
            } else {
              if (book.booklist.length > 0) {
                util.printTotalBookCount(book);
              } else {
                assert.fail("Book count must be above 1");
              }
            }
            resolve();
          },
        );
      });
    });

    it("Verify bookUrl format is valid", { timeout: 30000 }, async () => {
      const book = await new Promise((resolve, reject) => {
        lib.search(
          {
            title: "javascript",
            libraryName: firstLibraryName,
            startPage: 1,
          },
          (err, result) => {
            if (err) reject(new Error(err.msg));
            else resolve(result);
          },
        );
      });

      assert.ok(
        book.booklist.length > 0,
        "Need at least one book to test bookUrl",
      );

      const bookWithUrl = book.booklist.find((b) => b.bookUrl);
      assert.ok(bookWithUrl, "At least one book should have a bookUrl");

      const bookUrl = bookWithUrl.bookUrl;

      assert.ok(
        bookUrl.startsWith("http://") || bookUrl.startsWith("https://"),
        `bookUrl should start with http:// or https://: ${bookUrl}`,
      );

      const getBaseDomain = (url) => {
        try {
          const hostname = new URL(url.split("#")[0]).hostname;
          const parts = hostname.split(".");
          return parts.slice(-2).join(".");
        } catch {
          return null;
        }
      };

      const homeBaseDomain = getBaseDomain(lib.homeUrl);
      const bookBaseDomain = getBaseDomain(bookUrl);

      assert.ok(
        homeBaseDomain && bookBaseDomain && homeBaseDomain === bookBaseDomain,
        `bookUrl domain (${bookBaseDomain}) should match homeUrl domain (${homeBaseDomain}): ${bookUrl}`,
      );

      const urlWithoutHash = bookUrl.split("#")[0];
      try {
        new URL(urlWithoutHash);
      } catch {
        assert.fail(`bookUrl base is not a valid URL: ${bookUrl}`);
      }

      console.log(`  ✓ bookUrl format verified: ${bookUrl}`);
    });

    it("Verify bookUrl is accessible", { timeout: 30000 }, async () => {
      const book = await new Promise((resolve, reject) => {
        lib.search(
          {
            title: "javascript",
            libraryName: firstLibraryName,
            startPage: 1,
          },
          (err, result) => {
            if (err) reject(new Error(err.msg));
            else resolve(result);
          },
        );
      });

      assert.ok(
        book.booklist.length > 0,
        "Need at least one book to test bookUrl accessibility",
      );

      const bookWithUrl = book.booklist.find((b) => b.bookUrl);
      assert.ok(bookWithUrl, "At least one book should have a bookUrl");

      const bookUrl = bookWithUrl.bookUrl;

      // Skip hash-only URLs (e.g., gunpo uses client-side routing)
      const urlWithoutHash = bookUrl.split("#")[0];
      if (urlWithoutHash !== bookUrl && !urlWithoutHash.includes("?")) {
        console.log(`  ⊘ Skipping accessibility check for hash-based URL: ${bookUrl}`);
        return;
      }

      const urlObj = new URL(bookUrl);

      // Skip domains that require session-based access
      const sessionRequiredDomains = ["lib.goe.go.kr"];
      if (sessionRequiredDomains.includes(urlObj.hostname)) {
        console.log(`  ⊘ Skipping accessibility check (session required): ${bookUrl}`);
        return;
      }

      try {
        // Extract origin for Referer header (some sites require it)
        const referer = urlObj.origin + "/";

        const response = await request(bookUrl, {
          method: "GET",
          maxRedirections: 5,
          headersTimeout: 20000,
          bodyTimeout: 20000,
          headers: {
            "User-Agent": DEFAULT_USER_AGENT,
            Referer: referer,
          },
        });

        const body = await response.body.text();

        assert.ok(
          response.statusCode < 400,
          `bookUrl returns error status ${response.statusCode}: ${bookUrl}`,
        );

        // Check for common Korean error page indicators
        const errorIndicators = [
          "페이지를 찾을 수 없습니다",
          "존재하지 않는 페이지",
          "잘못된 접근",
          "요청하신 페이지를 찾을 수 없습니다",
        ];

        const hasErrorContent = errorIndicators.some((indicator) =>
          body.includes(indicator),
        );

        assert.ok(
          !hasErrorContent,
          `bookUrl appears to be a soft 404 (error page content detected): ${bookUrl}`,
        );

        console.log(`  ✓ bookUrl is accessible (status ${response.statusCode}): ${bookUrl}`);
      } catch (error) {
        if (error.code === "ERR_ASSERTION") {
          throw error;
        }
        assert.fail(`bookUrl is not accessible (network error: ${error.message}): ${bookUrl}`);
      }
    });

    it(
      "Search with Korean titles (산, 자바, 소설)",
      { timeout: 60000 },
      async () => {
        const koreanTitles = ["산", "자바", "소설"];
        let anySuccess = false;
        const results = [];

        for (const title of koreanTitles) {
          try {
            const book = await new Promise((resolve, reject) => {
              lib.search(
                { title, libraryName: firstLibraryName, startPage: 1 },
                (err, result) => {
                  if (err) reject(new Error(err.msg));
                  else resolve(result);
                },
              );
            });

            const count = book.booklist?.length || 0;
            results.push({ title, count, success: count > 0 });

            if (count > 0) {
              anySuccess = true;
              console.log(`  ✓ "${title}": ${count} books found`);
            } else {
              console.log(`  - "${title}": 0 books found`);
            }
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

        assert.ok(
          anySuccess,
          `At least one Korean title should return results. Tried: ${results.map((r) => `"${r.title}"(${r.count})`).join(", ")}`,
        );
      },
    );

    it(
      "Make sure the book is searchable in each library",
      { timeout: 60000 },
      () => {
        return new Promise((resolve) => {
          let completed = 0;
          const failures = [];
          let successCount = 0;

          libraryNames.forEach((libraryName) => {
            lib.search(
              {
                title: "javascript",
                libraryName: libraryName,
                startPage: 1,
              },
              (err, book) => {
                completed++;

                if (err) {
                  console.log(`  ✗ ${libraryName}: ${err.msg}`);
                  failures.push(libraryName);
                } else {
                  assert.ok(
                    book.booklist !== undefined,
                    `${libraryName} should return a booklist`,
                  );
                  if (book.totalBookCount > 0) {
                    console.log(
                      `  ✓ ${libraryName}: ${book.totalBookCount} books found`,
                    );
                    successCount++;
                  } else {
                    console.log(
                      `  - ${libraryName}: 0 books found (may be expected for small collections)`,
                    );
                  }
                }

                if (completed === libraryNames.length) {
                  console.log(
                    `  Summary: ${successCount} libraries with results, ${failures.length} errors`,
                  );
                  assert.ok(
                    failures.length < libraryNames.length,
                    "At least one library should be searchable",
                  );
                  assert.ok(
                    successCount > 0,
                    "At least one library should return results",
                  );
                  resolve();
                }
              },
            );
          });
        });
      },
    );
  });
}

module.exports = { createLibraryTestSuite };
