const req = require('request');
const _ = require('lodash');
const getLibraryNames = require('../util.js').getLibraryNames;

const libraryList = [
  {code: '1', name: '산본도서관'},
  {code: '2', name: '당동도서관'},
  {code: '3', name: '대야도서관'},
  {code: '4', name: '어린이도서관'},
  {code: '5', name: '이동도서관'},
  {code: '6', name: '중앙도서관'},
  {code: '7', name: '누리천문대'},
  {code: '8', name: '시청북카페밥상머리'},
  {code: '9', name: '부곡도서관'},
  {code: '10', name: '당정문화도서관'},
  {code: '11', name: '동화나무어린이도서관'},
  {code: '12', name: '금정작은도서관'},
  {code: '13', name: '재궁꿈나무도서관'},
  {code: '14', name: '궁내동작은도서관'},
  {code: '15', name: '노루목작은도서관'},
  {code: '16', name: '버드나무에부는바람작은도서관'},
  {code: '17', name: '꿈쟁이도서관'},
  {code: '18', name: '우리마을도서관'},
  {code: '19', name: '북카페사랑아이엔지'},
  {code: '20', name: '산본역도서관'},
  {code: '21', name: '하늘정원작은도서관'},
  {code: '22', name: '꿈이지'},
  {code: '23', name: '꿈드림작은도서관'},
  {code: '24', name: '여담작은도서관'},
];

function getLibraryCode(libraryName) {
  const found = libraryList.find(lib => (lib.name === libraryName));
  return found ? found.code : '';
}

function getBookList(json) {
  return _.map(json.data ? json.data.list : [], function (book) {
    return {
      title: book.titleStatement,
      exist: book.branchVolumes.some(vol => (vol.cState.includes('대출가능'))),
      libraryName: book.branchVolumes.map(vol => vol.name).join(',')
    };
  });
}

function search(opt, getBook) {
  let title = opt.title;
  let libraryName = opt.libraryName;

  if (!title) {
    if (getBook) {
      getBook({msg: 'Need a book name'});
    }
    return;
  }

  const branch = getLibraryCode(libraryName)

  req.get({
    url: 'https://www.gunpolib.go.kr/pyxis-api/1/collections/1/search',
    timeout: 20000,
    headers: {
      "User-Agent": 'User-Agent:Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36'
    },
    qs: {
      all: `k|a|${title}`,
      branch,
      max: 1000
    }
  }, function (err, res, body) {
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
      const booklist = getBookList(JSON.parse(body))
      getBook(null, {
        totalBookCount: booklist.length,
        booklist,
      });
    }
  }
  );
}

module.exports = {
  search,
  getLibraryNames: function() {
    return getLibraryNames(libraryList);
  }
};
