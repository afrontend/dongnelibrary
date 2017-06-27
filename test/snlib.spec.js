var snlib = require('../src/library/snlib');
var util = require('../src/dongnelibrary_util.js');

describe('snlib (20s)', function () {
  this.timeout(20000);
  it('search book', function (done) {
    snlib.search({
      title: 'javascript',
      libraryName: '판교도서관',
      startPage: 5
    }, function (err, book) {
      if(err) {
        console.log(err.msg);
      } else {
        if(book.booklist.length > 0) {
          util.printBookList(book.booklist);
          util.printTotalBookCount(book);
        } else {
          console.log('book.booklist.length: ' + book.booklist.length);
        }
      }
      done();
    });
  });
});
