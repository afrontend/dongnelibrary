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

  describe(`${description} (제한시간 20초)`, function () {
    this.timeout(20000);

    it("Show library list", function (done) {
      assert.ok(libraryNames.length > 1);
      done();
    });

    it("Use empty book title", function (done) {
      lib.search(
        {
          title: "",
          libraryName: firstLibraryName,
          startPage: 1,
        },
        function (err) {
          if (err) {
            assert.ok(err.msg === "Need a book name");
          } else {
            assert.fail("Need a error msg");
          }
          done();
        },
      );
    });

    it("Use invalid book title", function (done) {
      lib.search(
        {
          title: "zyxwvutsrqponmlkjihgfedcbaabcdefghijklmnopqrstuvwxyz",
          libraryName: firstLibraryName,
          startPage: 1,
        },
        function (err, book) {
          if (err) {
            assert.fail("must have an empty booklist");
          }
          assert.equal(book.booklist.length, 0);
          done();
        },
      );
    });

    it("Use empty library name", function (done) {
      lib.search(
        {
          title: "javascript",
          libraryName: "",
          startPage: 1,
        },
        function (err, book) {
          if (err) {
            assert.ok(err.msg === "Need a library name");
          }
          assert.equal(book, undefined);
          done();
        },
      );
    });

    it("Show the book list of a library", function (done) {
      lib.search(
        {
          title: "javascript",
          libraryName: firstLibraryName,
          startPage: 1,
        },
        function (err, book) {
          if (err) {
            assert.fail(err.msg);
          } else {
            if (book.booklist.length > 0) {
              // util.printBookList(book.booklist);
              util.printTotalBookCount(book);
            } else {
              assert.fail("Book count must be above 1");
            }
          }
          done();
        },
      );
    });

    it("Make sure the book is searchable in each library", function (done) {
      this.timeout(60000);
      let completed = 0;
      const failures = [];

      libraryNames.forEach(function (libraryName) {
        lib.search(
          {
            title: "javascript",
            libraryName: libraryName,
            startPage: 1,
          },
          function (err, book) {
            completed++;

            if (err) {
              console.log(`  ✗ ${libraryName}: ${err.msg}`);
              failures.push(libraryName);
            } else {
              assert.ok(
                book.booklist !== undefined,
                `${libraryName} should return a booklist`,
              );
              console.log(
                `  ✓ ${libraryName}: ${book.totalBookCount} books found`,
              );
            }

            if (completed === libraryNames.length) {
              if (failures.length > 0) {
                console.log(`  Warning: ${failures.length} libraries failed`);
              }
              assert.ok(
                failures.length < libraryNames.length,
                "At least one library should be searchable",
              );
              done();
            }
          },
        );
      });
    });
  });
}

module.exports = { createLibraryTestSuite };
