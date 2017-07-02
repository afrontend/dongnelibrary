var jsdom = require('jsdom');
var req = require('request');
var _ = require('underscore');
var jquery = require('../dongnelibrary_util.js').getJqueryString();
var async = require('async');
var global = {};

var SEARCH_HOST = 'http://www.suwonlib.go.kr';

var libraryList = [
  {code: 'MA', name: '수원시선경도서관'},
  {code: 'MB', name: '수원시중앙도서관'},
  {code: 'MC', name: '수원시영통도서관'},
  {code: 'MD', name: '수원시슬기샘도서관'},
  {code: 'ME', name: '수원시바른샘도서관'},
  {code: 'MF', name: '수원시지혜샘도서관'},
  {code: 'MG', name: '수원시서수원도서관'},
  {code: 'MH', name: '수원시북수원도서관'},
  {code: 'MI', name: '수원시태장마루도서관'},
  {code: 'MK', name: '수원시한아름도서관'},
  {code: 'MM', name: '수원시반달어린이도서관'},
  {code: 'MN', name: '수원시사랑샘도서관'},
  {code: 'MO', name: '수원시희망샘도서관'},
  {code: 'MT', name: '수원시대추골도서관'},
  {code: 'MU', name: '수원시한림도서관'},
  {code: 'MV', name: '수원시창룡도서관'},
  {code: 'MW', name: '수원시버드내도서관'},
  {code: 'MX', name: '수원시광교홍재도서관'},
  {code: 'MY', name: '수원시호매실도서관'},
  {code: 'MZ', name: '수원시일월도서관'},
  {code: 'SB', name: '수원시화서다산도서관'},
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
  return (str.indexOf('비치중') >= 0)
}

function getTotalCount(str) {
  if (global.debug) {
    console.log(str);
  }
  var pattern = /(\d+)/g;
  var matches = pattern.exec(str);
  if (matches) {
    return matches[1];
  } else {
    return 0;
  }
}

function makeJsdomCallback(libraryName, body, opt, getBook) {
  return function (errors, window) {
    var booklist = [],
      $ = window.$,
      $a = $('#A-LibMPageSearchList').children(),
      totalBookCount = getTotalCount($('#A-LibMPageSearchInfo').text().trim());

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
          title: $value.find('h4.title').text().trim(),
          detailLink: $value.find('h4.title a').attr('href'),
          exist: false
        });
      });
    }

    var tasks = [];

    _.each(booklist, function(book, key) {
      tasks.push(function (callback) {
        searchDetail(book, function (err, exist) {
          if (err) {
            exist = false;
          }
          callback(null, exist);
        });
      });
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

  req.get({
    url: SEARCH_HOST + '/ct/html/02_search/search01.asp',
    timeout: 20000,
    headers: {
      "User-Agent": 'User-Agent:Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36'
    },
    qs: {
      a_lib: getLibraryCode(libraryName),
      a_v: 'f',
      a_qf: 'Z',
      a_q: title,
      a_vp: 100
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

function searchDetail(book, checkExistence) {
  if (global.debug) {
    console.log('book: ' + JSON.stringify(book, null, 2));
    console.log('detailUrl: ' + SEARCH_HOST + book.detailLink);
  }

  req.get({
    url: SEARCH_HOST + book.detailLink,
    timeout: 20000,
    headers: {
      "User-Agent": 'User-Agent:Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36'
    }
  }, function (err, res, body) {
    if (global.debug === true) {
      console.log('detail body ' + body);
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
          var $a = window.$('#A-LibMPage > table > tbody > tr:nth-child(2) > td:nth-child(1)');
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
