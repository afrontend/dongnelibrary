var gg = require('../src/library/gg');
var gunpo = require('../src/library/gunpo');
var hscity = require('../src/library/hscity');
var osan = require('../src/library/osan');
var snlib = require('../src/library/snlib');
var suwon = require('../src/library/suwon');
var util = require('../src/dongnelibrary_util.js');

describe('Should sure you can access the library.', function () {
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

  describe('군포시 도서관 (제한시간 20초)', function () {
    this.timeout(20000);
    it('search book', function (done) {
      gunpo.search({
        title: 'javascript',
        libraryName: '산본도서관',
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

  describe('화성시 도서관 (제한시간 20초)', function () {
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
          } else {
            console.log('book.booklist.length: ' + book.booklist.length);
          }
        }
        done();
      });
    });
  });

  describe('오산시 도서관 (제한시간 20초)', function () {
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

  describe('성남시 도서관 (제한시간 20초)', function () {
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

});

