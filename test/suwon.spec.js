const suwon = require('../src/library/suwon');
const util = require('../src/dongnelibrary_util.js');

describe('수원시 도서관 (제한시간 20초)', function () {
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
        } else {
          console.log('book.booklist.length: ' + book.booklist.length);
        }
      }
      done();
    });
  });
});
