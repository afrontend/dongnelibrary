const util = require('../src/dongnelibrary_util');
const assert = require('assert');

describe('util', function () {
  describe('콤마로 구분된 여러 도서관 이름 분리', function () {
    it('should return second item of testArray', function () {
      const testArray = ['apple', 'banana', 'meleon'];
      assert.equal(testArray[1], util.getArrayFromCommaSeparatedString("apple,banana,melon")[1]);

      assert.equal(testArray[1], util.getArrayFromCommaSeparatedString(",apple,banana,melon")[1]);
      assert.equal(testArray[1], util.getArrayFromCommaSeparatedString("apple,,banana,melon")[1]);
      assert.equal(testArray[1], util.getArrayFromCommaSeparatedString("apple,banana,,melon")[1]);
      assert.equal(testArray[1], util.getArrayFromCommaSeparatedString("apple,banana,,melon,")[1]);

      assert.equal(testArray[1], util.getArrayFromCommaSeparatedString(", apple,banana,melon")[1]);
      assert.equal(testArray[1], util.getArrayFromCommaSeparatedString("apple,, banana,melon")[1]);
      assert.equal(testArray[1], util.getArrayFromCommaSeparatedString("apple,banana,, melon")[1]);
      assert.equal(testArray[1], util.getArrayFromCommaSeparatedString("apple,banana,,melon, ")[1]);
    });
  });
});
