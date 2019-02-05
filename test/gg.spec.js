const gg = require('../src/library/gg');
const util = require('../src/dongnelibrary_util.js');

describe('경기도 도서관 (제한시간 20초)', function () {
  this.timeout(20000);
  it('search book', function (done) {
    gg.search({
      title: 'javascript',
      libraryName: '경기도립중앙도서관',
      startPage: 2
    }, function (err, book) {
      if(err) {
        console.log(err);
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
