const jsdom = require('jsdom');
const req = require('request');
const _ = require('lodash');
const jquery = require('../dongnelibrary_util.js').getJqueryString();
const getLibraryNames = require('../dongnelibrary_util.js').getLibraryNames;
const global = {};

const libraryList = [
  {code: 'CK', name: '중원어린이도서관'},
  {code: 'MA', name: '성남시중앙도서관'},
  {code: 'MB', name: '분당도서관'},
  {code: 'MG', name: '구미도서관'},
  {code: 'MH', name: '해오름도서관'},
  {code: 'MJ', name: '중원도서관'},
  {code: 'MM', name: '무지개도서관'},
  {code: 'MP', name: '판교도서관'},
  {code: 'MS', name: '수정도서관'},
  {code: 'MU', name: '운중도서관'},
  {code: 'MV', name: '서현도서관'},
  {code: 'PK', name: '판교어린이도서관'}
];

function getLibraryCode(libraryName) {
  const found = _.find(libraryList, function (lib) {
    return lib.name === libraryName;
  });

  if (found) {
    return found.code;
  }
  return '';
}

function isRented(str) {
  return !!str.indexOf('대출가능');
}

function makeJsdomCallback(libraryName, getBook) {
  return function(errors, window) {
    const booklist = [];
    const $ = window.$;
    const totalBookCount = parseInt($('#searchForm > p > strong.themeFC').text().trim(), 10);
    const $a = $('#searchForm > ul > li');
    console.log($a.length);
    _.each($a, function (value) {
      const $value = $(value);
      console.log($value.text());
      booklist.push({
        libraryName: libraryName,
        title: $value.find('dl > dt > a').text().trim(),
        exist: !isRented($value.find('.bookStateBar .emp8').text().trim())
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
  let title = '';
  let libraryName = '';

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
    url: 'https://www.snlib.go.kr/uj/menu/10641/program/30009/plusSearchResultList.do',
    timeout: 20000,
    headers: {
      "User-Agent": 'User-Agent:Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36'
    },
    qs : {
      searchType: 'SIMPLE',
      searchCategory: 'BOOK',
      currentPageNo: 1,
      viewStatus: 'IMAGE',
      preSearchKey: 'ALL',
      preSearchKeyword: title,
      searchKey: 'ALL',
      searchKeyword: title,
      searchLibraryArr: getLibraryCode(libraryName),
      searchSort: 'SIMILAR',
      searchOrder: 'DESC',
      searchRecordCount: 100
    }
  }, function (err, res, body) {
    if (global.debug === true) {
      console.log(body);
    }
    if (err || (res && res.statusCode !== 200)) {
      let msg = '';

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
