const getLibraryNames = require('../dongnelibrary_util.js').getLibraryNames;
const jquery = require('jquery');
const req = require('request')
const { JSDOM } = require("jsdom");

const libraryList = [
  {code: 'MA', name: '중앙도서관'},
  {code: 'MG', name: '꿈두레도서관'},
  {code: 'ME', name: '초평도서관'},
  {code: 'MC', name: '햇살마루도서관'},
  {code: 'MB', name: '청학도서관'},
  {code: 'MD', name: '양산도서관'},
  {code: 'MI', name: '소리울도서관'},
  {code: 'MY', name: '무지개도서관'},
  {code: 'MH', name: '고현초꿈키움도서관'},
  {code: 'MJ', name: '쌍용예가시민개방도서관'},
];

function getLibraryCode(libraryName) {
  const found = libraryList.find(lib => (lib.name === libraryName));
  return found ? found.code : '';
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

  // https://www.osanlibrary.go.kr/kolaseek/plus/search/plusSearchResultList.do?searchType=SIMPLE&searchCategory=ALL&searchLibraryArr=MA&searchKey=ALL&searchKeyword=javascript&searchRecordCount=20
  const lcode = getLibraryCode(libraryName)
  const etitle = encodeURIComponent(title)
  req.get({
    url: `https://www.osanlibrary.go.kr/kolaseek/plus/search/plusSearchResultList.do`,
    timeout: 20000,
    qs: {
      searchType: "SIMPLE",
      searchCategory: "ALL",
      searchLibraryArr: lcode,
      searchKey: "ALL",
      searchKeyword: etitle,
      searchRecordCount: 1000,
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
      const dom = new JSDOM(body);
      const $ = jquery(dom.window)
      const count = $('b.themeFC').text().match(/\d+/)[0]
      const booklist = []
      $('.resultList > li').each((_, a) => {
        const title = $(a).find('.tit a').text().trim()
        const rented = $(a).find('.bookStateBar .txt b').text().trim()
        const libraryName = $(a).find('.site > span:first-child').text().split(']')[1].trim()
        booklist.push({
          libraryName,
          title,
          maxoffset: count,
          exist: rented.includes('대출가능')
        });
      })
      getBook(null, {
        startPage: opt.startPage,
        totalBookCount: count,
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
