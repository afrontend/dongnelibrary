const assert = require('assert').strict
const lib = require('../src/library/snlib');
const util = require('../src/util.js');

describe('성남시 도서관 (제한시간 20초)', function () {
  this.timeout(20000);

  it('Show library list', function (done) {
    assert.ok(lib.getLibraryNames().length > 1);
    done();
  });

  it('Use empty book title', function (done) {
    lib.search({
      title: '',
      libraryName: '중앙도서관',
      startPage: 1
    }, function (err) {
      if(err) {
        assert.ok(err.msg === 'Need a book name');
      } else {
        assert.fail('Need a error msg')
      }
      done();
    });
  });

  it('Use invalid book title', function (done) {
    lib.search({
      title: 'zyxwvutsrqponmlkjihgfedcbaabcdefghijklmnopqrstuvwxyz',
      libraryName: '중앙도서관',
      startPage: 1
    }, function (err, book) {
      if(err) {
        assert.fail('must have an empty booklist');
      }
      assert.equal(book.booklist.length, 0)
      done();
    });
  });

  it('Show book list of one library', function (done) {
    lib.search({
      title: 'javascript',
      libraryName: '중앙도서관',
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
