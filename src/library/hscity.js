var jsdom = require('jsdom');
var req = require('request');
var _ = require('underscore');
var jquery = require('../dongnelibrary_util').getJqueryString();
var global = {};

var libraryList = [
  {code: 'MA', name: '남양도서관'},
  {code: 'MB', name: '태안도서관'},
  {code: 'MC', name: '삼괴도서관'},
  {code: 'MD', name: '병점도서관'},
  {code: 'ME', name: '샘내작은도서관'},
  {code: 'MF', name: '두빛나래어린이도서관'},
  {code: 'MG', name: '봉담도서관'},
  {code: 'MH', name: '둥지나래어린이도서관'},
  {code: 'MJ', name: '기아행복마루도서관'},
  {code: 'MK', name: '동탄복합문화센터도서관'},
  {code: 'ML', name: '송산도서관'},
  {code: 'MM', name: '정남도서관'}
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
  return !(str === '관외대출자료');
}

function makeJsdomCallback(libraryName, getBook) {
  return function(errors, window) {
    var booklist = [];
    var $ = window.$;
    var $a = $('#wrap > div.data_type5.mb15 > form > table > tbody > tr');
    _.each($a, function (value) {
      var $value = $(value);
      booklist.push({
        libraryName: libraryName,
        title: $value.find('td:nth-child(2) > a').text().trim(),
        exist: exist($value.find('td:nth-child(8)').text().trim())
      });
    });
    if (getBook) {
      getBook(null, {
        totalBookCount: booklist.length,
        booklist: booklist
      });
    }
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

  req.post({
    url: 'http://www.hscitylib.or.kr/UnitySearch/unity_library_result.do',
    timeout: 20000,
    headers: {
      "User-Agent": 'User-Agent:Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36'
    },
    form: {
      beforequery: "IAL:" + title + "*",
      sort: 'RK DESC',
      mgc: getLibraryCode(libraryName),
      jongbook: "_book",
      historycount: "0",
      startpage: "1",
      limitpage: "100",
      mode: '0'
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
        done: makeJsdomCallback(libraryName, getBook)
      });
    }
  }
  );
}

module.exports = {
  search: search,
  getLibraryNames: getLibraryNames
};
