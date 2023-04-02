const assert = require('assert').strict
const lib = require('../src/library/gunpo');
const util = require('../src/dongnelibrary_util.js');

describe('군포시 도서관 (제한시간 20초)', function () {
  this.timeout(20000);
  it('Show library list', function (done) {
    assert.ok(lib.getLibraryNames().length > 1);
    done();
  });

  it('Show book list of one name', function (done) {
    lib.search({
      title: 'javascript',
      libraryName: '군포시대야도서관',
      startPage: 1
    }, function (err, book) {
      if(err) {
        assert.fail(err.msg);
      } else {
        if(book.booklist.length > 0) {
          // util.printBookList(book.booklist);
          util.printTotalBookCount(book);
        } else {
          assert.fail('Book count must be above 1')
        }
      }
      done();
    });
  });
});
