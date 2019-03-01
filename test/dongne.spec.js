const dl = require('../src/dongnelibrary');
const assert = require('assert');

describe('dongnelibrary test', function () {
  describe('search in three libraries', function () {
    this.timeout(20000);
    const libNameArray = ['여주', '성남', '판교'];
    it('-l ' + libNameArray.join(','), function (done) {
      dl.search({
        title: 'javascript',
        libraryName:libNameArray
      }, function (err, book) {
        console.log(book.libraryName + ' "' + book.title + '"');
        book.booklist.forEach(function (book) {
          console.log((book.exist?' ✓ ':'  ') +' '+ book.title);
        });
        assert.notEqual(book.booklist.length, 0);
      }, function (err, books) {
        console.log(books.length + ' 개의 도서관을 검색했습니다.');
        console.log('books: ' + JSON.stringify(books, null, 2));
        done();
      });
    });
  });
});
