var util = require('../src/dongnelibrary_util');
var assert = require('assert');

describe('util', function () {
  describe('#getArrayFromCommaSeparatedString()', function () {
    it('should return second item of testArray', function () {
      var testArray = ['apple', 'banana', 'meleon'];
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
