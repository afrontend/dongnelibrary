var jsdom = require('jsdom');
var req = require('request');
var _ = require('lodash');
var jquery = require('../dongnelibrary_util').getJqueryString();
var getLibraryNames = require('../dongnelibrary_util.js').getLibraryNames;
var global = {};

var libraryList = [
  {code: '1', name: '군포시산본도서관'},
  {code: '2', name: '군포시당동도서관'},
  {code: '3', name: '군포시대야도서관'},
  {code: '4', name: '군포시어린이도서관'},
  {code: '5', name: '군포시이동도서관'},
  {code: '6', name: '군포시중앙도서관'},
  {code: '7', name: '군포시누리천문대'},
  {code: '8', name: '군포시시청북카페밥상머리'},
  {code: '9', name: '군포시부곡도서관'},
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

function getLibraryCode(libraryName) {
  var found = _.find(libraryList, function (lib) {
    return lib.name === libraryName;
  });

  if (found) {
    return found.code;
  }
  return '';
}

function getBookList(json) {
  return _.map(json.data ? json.data.list : [], function (book) {
    return {
      title: book.titleStatement,
      exist: _.some(book.branchVolumes, function (vol) { return vol.cState === '대출가능' }) === undefined ? false : true
    };
  });
}

function addLibraryNameToBookList(libraryName, booklist) {
  return _.map(booklist, function (book) {
    book.libraryName = libraryName;
    return book;
  });
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
    url: 'https://www.gunpolib.go.kr/pyxis-api/1/collections/1/search',
    timeout: 20000,
    headers: {
      "User-Agent": 'User-Agent:Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36'
    },
    qs: {
      all: `k|a|${title}`,
      branch: getLibraryCode(libraryName),
      max: 200
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
      var booklist = addLibraryNameToBookList(libraryName, getBookList(JSON.parse(body)));
      getBook(null, {
        totalBookCount: booklist.length,
        booklist: booklist
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
