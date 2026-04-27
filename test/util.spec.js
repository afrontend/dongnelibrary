const { describe, it } = require("node:test");
const util = require("../dist/util");
const assert = require("assert");

describe("util", () => {
  describe("stripHtml", () => {
    it("removes basic HTML tags", () => {
      assert.strictEqual(util.stripHtml("<b>hello</b>"), "hello");
    });

    it("removes tags with attributes", () => {
      assert.strictEqual(util.stripHtml("<span class='book'>제목</span>"), "제목");
    });

    it("removes multiple tags", () => {
      assert.strictEqual(
        util.stripHtml("<b>title</b> : <i>subtitle</i>"),
        "title : subtitle",
      );
    });

    it("returns the string unchanged when there are no tags", () => {
      assert.strictEqual(util.stripHtml("no tags"), "no tags");
    });

    it("returns empty string for empty input", () => {
      assert.strictEqual(util.stripHtml(""), "");
    });

    it("returns empty string for undefined", () => {
      assert.strictEqual(util.stripHtml(undefined), "");
    });

    it("returns empty string for null", () => {
      assert.strictEqual(util.stripHtml(null), "");
    });

    it("removes self-closing tags", () => {
      assert.strictEqual(util.stripHtml("line1<br/>line2"), "line1line2");
    });
  });

  describe("콤마로 구분된 여러 도서관 이름 분리", () => {
    it("should return second item of testArray", () => {
      const testArray = ["apple", "banana", "meleon"];
      assert.equal(
        testArray[1],
        util.getArrayFromCommaSeparatedString("apple,banana,melon")[1],
      );

      assert.equal(
        testArray[1],
        util.getArrayFromCommaSeparatedString(",apple,banana,melon")[1],
      );
      assert.equal(
        testArray[1],
        util.getArrayFromCommaSeparatedString("apple,,banana,melon")[1],
      );
      assert.equal(
        testArray[1],
        util.getArrayFromCommaSeparatedString("apple,banana,,melon")[1],
      );
      assert.equal(
        testArray[1],
        util.getArrayFromCommaSeparatedString("apple,banana,,melon,")[1],
      );

      assert.equal(
        testArray[1],
        util.getArrayFromCommaSeparatedString(", apple,banana,melon")[1],
      );
      assert.equal(
        testArray[1],
        util.getArrayFromCommaSeparatedString("apple,, banana,melon")[1],
      );
      assert.equal(
        testArray[1],
        util.getArrayFromCommaSeparatedString("apple,banana,, melon")[1],
      );
      assert.equal(
        testArray[1],
        util.getArrayFromCommaSeparatedString("apple,banana,,melon, ")[1],
      );
    });
  });
});
