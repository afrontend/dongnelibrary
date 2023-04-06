const getLibraryNames = require('../util.js').getLibraryNames;
const req = require('request');

const libraryList = [
  {code: 'MA', name: '선경도서관'},
  {code: 'MB', name: '중앙도서관'},
  {code: 'MC', name: '영통도서관'},
  {code: 'MD', name: '슬기샘도서관'},
  {code: 'ME', name: '바른샘도서관'},
  {code: 'MF', name: '지혜샘도서관'},
  {code: 'MG', name: '서수원도서관'},
  {code: 'MH', name: '북수원도서관'},
  {code: 'MI', name: '태장마루도서관'},
  {code: 'MK', name: '한아름도서관'},
  {code: 'MM', name: '반달어린이도서관'},
  {code: 'MN', name: '사랑샘도서관'},
  {code: 'MO', name: '희망샘도서관'},
  {code: 'MP', name: '화홍어린이도서관'},
  {code: 'MT', name: '대추골도서관'},
  {code: 'MU', name: '한림도서관'},
  {code: 'MV', name: '창룡도서관'},
  {code: 'MW', name: '버드내도서관'},
  {code: 'MX', name: '광교홍재도서관'},
  {code: 'MY', name: '호매실도서관'},
  {code: 'MZ', name: '일월도서관'},
  {code: 'SB', name: '화서다산도서관'},
  {code: 'SC', name: '광교푸른숲도서관'},
  {code: 'SD', name: '매여울도서관'},
  {code: 'SE', name: '망포글빛도서관'},
];

function getLibraryCode(libraryName) {
  const found = libraryList.find(lib => (lib.name === libraryName));
  return found ? found.code : 'ALL';
}

function getBookList(json) {
  const bl = json.contents ? json.contents.bookList : []
  return bl.map(function (book) {
    return {
      title: book.originalTitle,
      exist: book.workingStatus === "비치중",
      libraryName: book.libName
    };
  });
}

function search(opt, getBook) {
  let title = opt.title
  let libraryName = opt.libraryName

  if (!title) {
    if (getBook) {
      getBook({msg: 'Need a book name'});
    }
    return;
  }

  const lcode = getLibraryCode(libraryName)
  // const etitle = encodeURIComponent(title)
  req.post({
    url: 'https://www.suwonlib.go.kr:8443/api/search',
    timeout: 20000,
    headers: {
      "User-Agent": 'User-Agent:Mozilla/5.0 (X11 Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36'
    },
    form: {
      article: "SCORE",
      display: "1000",
      manageCode: lcode,
      order: "DESC",
      page: "1",
      pubFormCode: "MO",
      searchKeyword: title,
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
  });
}

module.exports = {
  search,
  getLibraryNames: function() {
    return getLibraryNames(libraryList);
  }
};
