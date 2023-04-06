const assert = require('assert').strict
const lib = require('../src/library/gg');
const util = require('../src/util.js');

describe('경기도 도서관 (제한시간 20초)', function () {
  this.timeout(20000);

  it('Show library list', function (done) {
    assert.ok(lib.getLibraryNames().length > 1);
    done();
  });

  it('Use empty book title', function (done) {
    lib.search({
      title: '',
      libraryName: '경기평택교육도서관',
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
      libraryName: '경기평택교육도서관',
      startPage: 1
    }, function (err, book) {
      if(err) {
        assert.fail('must have an empty booklist');
      }
      assert.equal(book.booklist.length, 0)
      done();
    });
  });

  it('Use empty library name', function (done) {
    lib.search({
      title: '자바스크립트',
      libraryName: '',
      startPage: 1
    }, function (err, book) {
      if(err) {
        assert.ok(err.msg === 'Need a library name');
      }
      assert.equal(book, undefined)
      done();
    });
  });

  it('Show book list of one library', function (done) {
    lib.search({
      title: 'javascript',
      libraryName: '경기평택교육도서관',
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
