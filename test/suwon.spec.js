var suwon = require('../src/library/suwon');
var util = require('../src/dongnelibrary_util.js');

describe('suwon (20s)', function () {
  this.timeout(20000);
  it('search book', function (done) {
    suwon.search({
      title: 'javascript',
      libraryName: '수원시중앙도서관',
    }, function (err, book) {
      if(err) {
        console.log(err);
      } else {
        if(book.booklist.length > 0) {
          util.printBookList(book.booklist);
          util.printTotalBookCount(book);
          done();
        } else {
          console.log('book.booklist.length: ' + book.booklist.length);
        }
      }
    });
  });
});
