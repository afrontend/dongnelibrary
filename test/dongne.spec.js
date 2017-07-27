var dl = require('../src/dongnelibrary');
var assert = require('assert');

describe('Should sure you can search the library.', function () {
  describe('Should can accept one library name.', function () {
    this.timeout(20000);
    it('-l 여주', function (done) {
      dl.search({
        title: 'javascript',
        libraryName: '여주'
      }, function (err, book) {
        console.log(book.libraryName + ' "' + book.title + '"');
        book.booklist.forEach(function (book) {
          console.log((book.exist?' ✓ ':'  ') +' '+ book.title);
        });
        assert.notEqual(book.booklist.length, 0);
        done();
      });
    });
  });

  describe('Should can use several library name as comma separated string', function () {
    this.timeout(20000);
    var libNameArray = ['여주', '성남', '판교'];
    var libCheckPoint = 0;
    it('-l ' + libNameArray.join(','), function (done) {
      dl.search({
        title: 'javascript',
        libraryName:libNameArray
      }, function (err, book) {
        libCheckPoint++;
        console.log(book.libraryName + ' "' + book.title + '"');
        book.booklist.forEach(function (book) {
          console.log((book.exist?' ✓ ':'  ') +' '+ book.title);
        });
        assert.notEqual(book.booklist.length, 0);
        if (libCheckPoint === libNameArray.length) {
          done();
        }
      });
    });
  });
});


