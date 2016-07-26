var jsdom = require('jsdom');
var req = require('request');
var _ = require('underscore');
var fs = require('fs');
var jquery = require('./dongnelibrary_util.js').getJqueryString();

var libraryList = [
  {code: 'MA', name: '성남시중앙도서관'},
  {code: 'MB', name: '분당도서관'},
  {code: 'MG', name: '구미도서관'},
  {code: 'MJ', name: '중원도서관'},
  {code: 'MM', name: '무지개도서관'},
  {code: 'MP', name: '판교도서관'},
  {code: 'MS', name: '수정도서관'},
  {code: 'MU', name: '운중도서관'},
  {code: 'CK', name: '중원어린이도서관'},
  {code: 'PK', name: '판교어린이도서관'}
];

function getLibraryNames() {
  return _.pluck(libraryList, 'name');
}

function getLibraryCode(libraryName) {
  var found = _.find(libraryList, function (lib) {
    return lib.name === libraryName;
  });

  if(found) {
    return found.code;
  }
  return '';
}

function exist(str) {
  return !(str === '대출중');
}

function getBookIds(str) {
  var bookIdPattern = /javascript:viewSearchDetail\((\d+)\)/g,
      matches,
      bookIdList = [];

  while (matches = bookIdPattern.exec(str)) {
    bookIdList.push(matches[1]);
  }

  return bookIdList;
}

function appendBookId(booklist, str) {
  var bookIdList = getBookIds(str);
  return _.map(booklist, function(item, key){
      item.bookId = bookIdList[key];
      return item;
  });
}

function makeJsdomCallback(libraryName, body, opt, callback) {
  return function (errors, window) {
    var booklist = [];
    var $ = window.$;
    var $a = $('#textViewList > li');
    var checkPoint = 0;
    var checkPointLimit = 0;

    _.each($a, function (value) {
        var $value = $(value);
        booklist.push({
            libraryName: libraryName,
            title: $value.find('p > a').text().trim(),
            exist: false
        });
    });

    checkPointLimit = booklist.length;

    appendBookId(booklist, body);

    _.each(booklist, function(book, key) {
        var o = _.clone(opt);
        o.bookId = book.bookId;
        var index = key;

        searchDetail(o, function (exist) {
            booklist[index].exist = exist;
            checkPoint = checkPoint + 1;
            if(checkPoint === checkPointLimit) {
              if(callback) {
                callback({
                    code: 0,
                    msg: "No Error"
                  }, booklist);
              }
            }
        });
    });

    window.close();
  }
}

function search(opt, callback) {
  var booklist = [];
  var title = 'javascript';
  var libraryName = '판교도서관';

  if(opt.title) {
    title = opt.title;
  }

  if(opt.libraryName) {
    libraryName = opt.libraryName;
  }

  req.post({
      url: 'http://search.snlib.net/search/resultSearchList',
      headers: {
        "User-Agent": 'User-Agent:Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36'
      },
      timeout: 20000,
      form: {
        curPage: 1,
        viewStatus: 'text',
        searchKey: 2,
        searchKeyword: title,
        searchLibrary: getLibraryCode(libraryName)
      }
    }, function (error, res, body) {
      //console.log('body: ' + body);
      if (!error && res.statusCode === 200) {
        jsdom.env({
            html: body,
            src: [jquery],
            done: makeJsdomCallback(libraryName, body, _.clone(opt), callback)
        });
      } else {
        var msg = 'Error';
        if(error) {
          msg = error;
        }

        if(res && res.statusCode) {
          msg = msg + " HTTP return code ("+res.statusCode+")";
        }

        if(callback) {
          callback({
              code: 1,
              msg: msg
            }, []);
        }
      }
    }
  );
}

function searchDetail(opt, callback) {
  var booklist = [];
  var bookId = '2923889';
  var title = 'javascript';
  var libraryName = '판교도서관';

  if(opt.bookId) {
    bookId = opt.bookId;
  }

  if(opt.title) {
    title = opt.title;
  }

  if(opt.libraryName) {
    libraryName = opt.libraryName;
  }

  req.post({
      url: 'http://search.snlib.net/search/viewSearchDetail',
      headers: {
        "User-Agent": 'User-Agent:Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36'
      },
      timeout: 20000,
      form: {
        searchKey: 2,
        searchLibrary: getLibraryCode(libraryName),
        searchKeyword: title,
        curPage: 2,
        viewStatus: 'text',
        bookId: bookId
      }
    }, function (error, res, body) {
      if (!error && res.statusCode === 200) {
        jsdom.env({
            html: body,
            src: [jquery],
            done: function (errors, window) {
              var $a = window.$('#frm > div:nth-child(15) > div > table > tbody > tr > td:nth-child(4)');

              if(callback) {
                if(exist(($a.text() + "").trim())) {
                  callback(true);
                } else {
                  callback(false);
                }
              }

              window.close();
            }
        });
      } else {
        var msg = 'Error';
        if(error) {
          msg = error;
        }

        if(res && res.statusCode) {
          msg = msg + " HTTP return code ("+res.statusCode+")";
        }

        if(callback) {
          callback(false);
        }
      }
    }
  );
}

module.exports = {
  search: search,
  getLibraryNames: getLibraryNames
};
