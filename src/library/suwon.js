const getLibraryNames = require('../dongnelibrary_util.js').getLibraryNames;
const req = require('request');

const libraryList = [
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
