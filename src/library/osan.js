var jsdom = require('jsdom');
var req = require('request');
var _ = require('lodash');
var jquery = require('../dongnelibrary_util').getJqueryString();
var getLibraryNames = require('../dongnelibrary_util.js').getLibraryNames;
var global = {};

var libraryList = [
  {code: 'MA', name: '오산중앙도서관'},
  {code: 'MB', name: '청학도서관'},
  {code: 'MC', name: '햇살마루도서관'},
  {code: 'MD', name: '양산도서관'},
  {code: 'ME', name: '초평도서관'},
  {code: 'MG', name: '꿈두레도서관'}
];

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
    var $a = $("form[name='searchPage'] table tr td table tr");
    _.each($a, function (value, key) {
        if (key !== 0) {
          var $value = $(value);
          booklist.push({
              libraryName: libraryName,
              title: $value.find('td:nth-child(2) > a').text().trim(),
              exist: exist($value.find('td:nth-child(8)').text().trim())
          });
        }
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
      url: 'http://www.osanlibrary.go.kr:9090/kolas3_01/BookSearch/search_result.do?jongbook=_book&field1=IAL&aon1=AND&field2=IT&value2=&aon2=AND&field3=IA&value3=&aon3=AND&buho1=SIB&buhovalue1=&aon4=AND&buho2=KDC&buhovalue2=&aon5=AND&buhovalue3=&univname=&aon6=AND&buhovalue4=&govname=&sort=RK+DESC&msa=&formclass=&textlang=&simplelang=&startyear=&endyear=&limitpage=100&local=+&startpage=1&mode=0&mgc='+getLibraryCode(libraryName),
      timeout: 20000,
      headers: {
        "User-Agent": 'User-Agent:Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36'
      },
      form: {
        value1: title
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
  getLibraryNames: function() {
    return getLibraryNames(libraryList);
  }
};
