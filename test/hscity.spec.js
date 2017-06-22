var hscity = require('../src/library/hscity');
var util = require('../src/dongnelibrary_util.js');

describe('hscity (20s)', function () {
  this.timeout(20000);
  it('search book', function (done) {
    hscity.search({
      title: 'javascript',
      libraryName: '남양도서관'
    }, function (err, book) {
      if(err) {
        console.log(err.msg);
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
