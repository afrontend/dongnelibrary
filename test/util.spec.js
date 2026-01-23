const { describe, it } = require("node:test");
const util = require("../dist/util");
const assert = require("assert");

describe("util", () => {
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
