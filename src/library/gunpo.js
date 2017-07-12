var jsdom = require('jsdom');
var req = require('request');
var _ = require('underscore');
var jquery = require('../dongnelibrary_util').getJqueryString();
var global = {};

var libraryList = [
  {code: '01', name: '군포시산본도서관'},
  {code: '02', name: '군포시당동도서관'},
  {code: '03', name: '군포시대야도서관'},
  {code: '04', name: '군포시어린이도서관'},
  {code: '05', name: '군포시이동도서관'},
  {code: '06', name: '군포시중앙도서관'},
  {code: '09', name: '군포시부곡도서관'},
  {code: '10', name: '군포시당정문화도서관'},
  {code: '11', name: '군포시동화나무어린이도서관'},
  {code: '12', name: '군포시금정작은도서관'},
  {code: '13', name: '군포시재궁꿈나무도서관'},
  {code: '14', name: '군포시궁내동작은도서관'},
  {code: '15', name: '군포시노루목작은도서관'},
  {code: '16', name: '군포시버드나무에부는바람작은도서관'},
  {code: '17', name: '군포시꿈쟁이도서관'},
  {code: '18', name: '군포시우리마을도서관'},
  {code: '19', name: '군포시북카페사랑아이엔지'},
  {code: '20', name: '군포시산본역도서관'},
  {code: '21', name: '군포시하늘정원작은도서관'},
  {code: '22', name: '군포시꿈이지'},
  {code: '23', name: '군포시꿈드림작은도서관'},
  {code: '24', name: '군포시여담작은도서관'},
];

//document.querySelector('#searchResultInner > div.searchTitle5 > h3 > span').textContent
//"(146건중 10건 출력)"

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
  return (str.indexOf('대출가능') !== -1);
}

function getTotalCount(str) {
  var pattern = /^\((\d+)/g,
      match;

  match = pattern.exec(str);
  if (match) {
    return match[1];
  } else {
    return null;
  }
}

function makeJsdomCallback(libraryName, getBook) {
  return function(errors, window) {
    var booklist = [];
    var $ = window.$;
    var totalBookCount = getTotalCount($('#searchResultInner > div.searchTitle5 > h3 > span').text().trim());
    var $a = $('#frmResultList > ul > li');
    _.each($a, function (value) {
        var $value = $(value);
        booklist.push({
            libraryName: libraryName,
            title: $value.find('.body > a.title').text().trim(),
            exist: exist($value.find('.tag').text().trim())
        });
    });

    if (getBook) {
      getBook(null, {
        totalBookCount: totalBookCount || booklist.length,
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

  req.get({
      url: 'http://www.gunpolib.go.kr/search/Search.Result.ax',
      timeout: 20000,
      headers: {
        "User-Agent": 'User-Agent:Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36'
      },
      qs: {
        sid: '1',
        mf: 'true',
        br: getLibraryCode(libraryName),
        item: 'ALL',
        value: title,
        pageSize: 9999
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
