const assert = require('assert').strict
const lib = require('../src/library/suwon');
const util = require('../src/dongnelibrary_util.js');

describe('수원시 도서관 (제한시간 25초)', function () {
  this.timeout(25000);
  it('Show library list', function (done) {
    assert.ok(lib.getLibraryNames().length > 1);
    done();
  });

  it('Show book list of one library', function (done) {
    lib.search({
      title: 'javascript',
      libraryName: '수원시중앙도서관',
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


  it('Show book list of all libraries', function (done) {
    lib.search({
      title: 'javascript',
      libraryName: '',
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
