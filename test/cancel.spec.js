const { describe, it } = require("node:test");
const assert = require("assert");
const dl = require("../dist/dongnelibrary");
const gunpo = require("../dist/localLibraryModule/gunpo");

describe("Cancellation", () => {
  describe("AbortController support", () => {
    it(
      "should skip search when signal is already aborted",
      { timeout: 5000 },
      () => {
        return new Promise((resolve) => {
          const controller = new AbortController();
          controller.abort(); // Abort before search starts

          const results = [];

          dl.search(
            {
              title: "자바",
              libraryName: ["산본도서관", "당동도서관"],
              signal: controller.signal,
            },
            (err, result) => {
              if (!err && result) {
                results.push(result);
              }
            },
            () => {
              // With pre-aborted signal, no results should be returned
              assert.strictEqual(
                results.length,
                0,
                "Should have no results when signal is pre-aborted",
              );
              resolve();
            },
          );
        });
      },
    );

    it(
      "should cancel in-flight requests when aborted",
      { timeout: 20000 },
      () => {
        return new Promise((resolve) => {
          const controller = new AbortController();
          const errors = [];
          const results = [];

          dl.search(
            {
              title: "자바스크립트",
              libraryName: [
                "산본도서관",
                "당동도서관",
                "대야도서관",
                "군포중앙도서관",
              ],
              signal: controller.signal,
            },
            (err, result) => {
              if (err) {
                errors.push(err);
              } else if (result) {
                results.push(result);
              }
            },
            () => {
              // Should have some aborted requests (errors) or fewer results than requested
              const totalResponses = errors.length + results.length;
              console.log(
                `#   Results: ${results.length}, Errors: ${errors.length}`,
              );
              assert.ok(totalResponses <= 4, "Should have at most 4 responses");
              // At least some should be aborted
              assert.ok(
                errors.some(
                  (e) => e.msg.includes("abort") || e.msg.includes("Abort"),
                ) || results.length < 4,
                "Should have some aborted requests or fewer results",
              );
              resolve();
            },
          );

          // Abort after 100ms to catch some in-flight
          setTimeout(() => {
            controller.abort();
            console.log("#   Signal aborted after 100ms");
          }, 100);
        });
      },
    );

    it(
      "should throw AbortError in library module when aborted",
      { timeout: 10000 },
      async () => {
        const controller = new AbortController();

        // Abort after 50ms
        setTimeout(() => controller.abort(), 50);

        try {
          await gunpo.search({
            title: "자바스크립트",
            libraryName: "산본도서관",
            signal: controller.signal,
          });
          // If we get here, the request completed before abort
          console.log("#   Request completed before abort (this is OK)");
        } catch (err) {
          // Should be an AbortError
          assert.ok(
            err.name === "AbortError" || err.message.includes("abort"),
            `Expected AbortError, got: ${err.name} - ${err.message}`,
          );
          console.log("#   Caught expected AbortError");
        }
      },
    );

    it("should work normally without signal", { timeout: 20000 }, () => {
      return new Promise((resolve, reject) => {
        dl.search(
          {
            title: "자바",
            libraryName: "산본도서관",
            // No signal provided
          },
          (err, result) => {
            if (err) {
              reject(new Error(err.msg));
              return;
            }
            assert.ok(result.booklist, "Should have booklist");
          },
          (err, results) => {
            if (err) {
              reject(new Error(err.msg));
              return;
            }
            assert.strictEqual(results.length, 1, "Should have 1 result");
            console.log(
              `#   Search without signal: ${results[0].booklist.length} books found`,
            );
            resolve();
          },
        );
      });
    });
  });
});
