const { describe, it } = require("node:test");
const dl = require("../dist/dongnelibrary");
const assert = require("assert");

describe("dongnelibrary test", () => {
  describe("search in four libraries", () => {
    const libNameArray = ["여주", "성남", "판교", "선경"];
    it("-l " + libNameArray.join(","), { timeout: 20000 }, () => {
      return new Promise((resolve, reject) => {
        dl.search(
          {
            title: "자바스크립트",
            libraryName: libNameArray,
          },
          (err, book) => {
            if (err) {
              assert.fail(err.msg);
            }
            assert.notEqual(book.booklist.length, 0);
          },
          (err, books) => {
            if (err) {
              assert.fail(err.msg);
              reject(err);
            }
            assert.equal(books.length, 4);
            resolve();
          },
        );
      });
    });
  });
});
