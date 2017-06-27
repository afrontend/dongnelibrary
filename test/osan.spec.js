var osan = require('../src/library/osan');
var util = require('../src/dongnelibrary_util.js');

describe('osan (20s)', function () {
  this.timeout(20000);
  it('search book', function (done) {
    osan.search({
      title: 'javascript',
      libraryName: '오산중앙도서관'
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
