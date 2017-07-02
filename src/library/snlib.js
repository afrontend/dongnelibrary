var jsdom = require('jsdom');
var req = require('request');
var _ = require('underscore');
var jquery = require('../dongnelibrary_util.js').getJqueryString();
var async = require('async');
var global = {};

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

  if (found) {
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

function makeJsdomCallback(libraryName, body, opt, getBook) {
  return function (errors, window) {
    var booklist = [],
        $ = window.$,
        $a = $('#textViewList > li'),
        totalBookCount = $('body > p > strong:nth-child(3)').text();

    if (totalBookCount === '0') {
      getBook(null, {
        startPage: opt.startPage,
        totalBookCount: +totalBookCount,
        booklist: booklist
      });
      return;
    } else {
      _.each($a, function (value) {
        var $value = $(value);
        booklist.push({
          libraryName: libraryName,
          title: $value.find('p > a').text().trim(),
          exist: false
        });
      });
    }

    appendBookId(booklist, body);

    var tasks = [];

    _.each(booklist, function(book, key) {
      var o = _.clone(opt);
      o.bookId = book.bookId;
      tasks.push(function (callback) {
        searchDetail(o, function (err, exist) {
          if (err) {
            exist = false;
          }
          callback(null, exist);
        });
      })
    });

    async.parallel(tasks, function (err, results) {
      if (err) {
        getBook({msg: 'Error, Can\'t access detail information'});
        return;
      }
      if (getBook) {
        booklist = _.map(booklist, function (item, key) {
          item.exist = results[key];
          return item;
        });
        getBook(null, {
          startPage: opt.startPage,
          totalBookCount: totalBookCount,
          booklist: booklist
        });
      }
    });

    window.close();
  }
}

function search(opt, getBook) {
  var title = '';
  var libraryName = '';
  var startPage = 1;

  if (opt.debug) {
    global.debug = true;
  }

  if (opt.title) {
    title = opt.title;
  } else {
    if (getBook) {
      getBook({msg: 'Need a book name'});
    }
    return;
  }

  if (opt.libraryName) {
    libraryName = opt.libraryName;
  } else {
    if (getBook) {
      getBook({msg: 'Need a library name'});
    }
    return;
  }

  if (opt.startPage) {
    startPage = opt.startPage;
  }

  req.post({
      url: 'http://search.snlib.go.kr/search/resultSearchList',
      headers: {
        "User-Agent": 'User-Agent:Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36'
      },
      timeout: 20000,
      form: {
        curPage: startPage,
        viewStatus: 'text',
        searchKey: 2,
        searchKeyword: title,
        searchLibrary: getLibraryCode(libraryName)
      }
    }, function (err, res, body) {
      if (global.debug === true) {
        console.log(body);
      }
      if (err || (res && res.statusCode !== 200)) {
        var msg = '';

        if (err) {
          msg = err;
        }

        if (res && res.statusCode) {
          msg = msg + " " + res.statusCode;
        }

        if (getBook) {
          getBook({msg: msg});
        }
      } else {
        jsdom.env({
            html: body,
            src: [jquery],
            done: makeJsdomCallback(libraryName, body, _.clone(opt), getBook)
        });
      }
    }
  );
}

function searchDetail(opt, checkExistence) {
  var bookId = '';
  var title = '';
  var libraryName = '';

  if (global.debug) {
    console.log('opt: ' + JSON.stringify(opt, null, 2));
  }

  if (opt.bookId) {
    bookId = opt.bookId;
  }

  if (opt.title) {
    title = opt.title;
  } else {
    if (checkExistence) {
      checkExistence({msg: 'Need a book name'});
    }
    return;
  }

  if (opt.libraryName) {
    libraryName = opt.libraryName;
  } else {
    if (checkExistence) {
      checkExistence({msg: 'Need a library name'});
    }
    return;
  }

  req.post({
      url: 'http://search.snlib.go.kr/search/viewSearchDetail',
      timeout: 20000,
      headers: {
        "User-Agent": 'User-Agent:Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36'
      },
      form: {
        searchKey: 2,
        searchLibrary: getLibraryCode(libraryName),
        searchKeyword: title,
        curPage: 2,
        viewStatus: 'text',
        bookId: bookId
      }
    }, function (err, res, body) {
      if (global.debug === true) {
        console.log(body);
      }
      if (err) {
        if (checkExistence) {
          checkExistence({msg: err});
        }
      } else {
        jsdom.env({
            html: body,
            src: [jquery],
            done: function (errors, window) {
              var $a = window.$('#frm > div:nth-child(15) > div > table > tbody > tr > td:nth-child(4)');
              if (checkExistence) {
                if (global.debug === true) {
                  console.log('$a.text(): ' + $a.text());
                }
                if (exist(($a.text() + "").trim())) {
                  checkExistence(null, true);
                } else {
                  checkExistence(null, false);
                }
              }

              window.close();
            }
        });
      }
    }
  );
}

module.exports = {
  search: search,
  getLibraryNames: getLibraryNames
};
