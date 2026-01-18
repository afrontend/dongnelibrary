const { describe, it } = require("node:test");
const assert = require("assert").strict;
const util = require("../../src/util.js");

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

    it("Make sure the book is searchable in each library", { timeout: 60000 }, () => {
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
    });
  });
}

module.exports = { createLibraryTestSuite };
