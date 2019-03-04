const jsdom = require('jsdom');
const req = require('request');
const _ = require('lodash');
const jquery = require('../dongnelibrary_util').getJqueryString();
const getLibraryNames = require('../dongnelibrary_util.js').getLibraryNames;
const global = {};

const libraryList = [
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
  {code: 'MM', name: '정남도서관'},
  {code: 'MN', name: '비봉작은도서관'},
  {code: 'MO', name: '진안도서관'},
  {code: 'MP', name: '동탄중앙이음터도서관'}
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
  return !~str.indexOf('대출가능');
}

function makeJsdomCallback(libraryName, getBook) {
  return function(errors, window) {
    const booklist = [];
    const $ = window.$;
    const $a = $('.booklist > li');
    _.each($a, function (value) {
      const $value = $(value);
      booklist.push({
        libraryName: libraryName,
        title: $value.find('ul > li > dl > dt > a').text().trim(),
        exist: !isRented($value.find('ul > li > dl > dd > span').text().trim())
      });
    });
    if (getBook) {
      getBook(null, {
        totalBookCount: booklist.length,
        booklist: booklist
      });
    }
    window.close();
  };
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

  req.post({
    url: 'http://hscitylib.or.kr/kolaseek/booksearch/plusSearchResultList.do',
    timeout: 20000,
    headers: {
      "User-Agent": 'User-Agent:Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36'
    },
    form: {
      searchType: 'SIMPLE',
      searchCategory: 'ALL',
      currentPageNo: 1,
      viewStatus: 'IMAGE',
      preSearchKey: 'ALL',
      preSearchKeyword: 'javascript',
      searchKey: 'ALL',
      searchKeyword: 'javascript',
      searchLibraryArr: getLibraryCode(libraryName),
      searchSort: 'SIMILAR',
      searchOrder: 'DESC',
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
