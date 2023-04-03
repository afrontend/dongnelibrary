const getLibraryNames = require('../dongnelibrary_util.js').getLibraryNames;
const jquery = require('jquery');
const req = require('request')
const { JSDOM } = require("jsdom");

const libraryList = [
  {code: 'MA', name: '경기중앙교육도서관'},
  {code: 'MB', name: '경기평택교육도서관'},
  {code: 'MC', name: '경기광주교육도서관'},
  {code: 'MD', name: '경기여주가남교육도서관'},
  {code: 'ME', name: '경기포천교육도서관'},
  {code: 'MF', name: '경기김포교육도서관'},
  {code: 'MG', name: '경기과천교육도서관'},
  {code: 'MH', name: '경기성남교육도서관'},
  {code: 'MJ', name: '경기화성교육도서관'},
  {code: 'MK', name: '경기의정부교육도서관'},
  {code: 'ML', name: '경기평생교육학습관'},
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

  if (!libraryName) {
    if (getBook) {
      getBook({msg: 'Need a library name'});
    }
    return;
  }

  // 'https://lib.goe.go.kr/gg/intro/search/index.do?viewPage=1&search_text=javascript&booktype=BOOKANDNONBOOK&libraryCodes=MB&rowCount=1000',
  const lcode = getLibraryCode(libraryName)
  const etitle = encodeURIComponent(title)
  req.get({
    url: `https://lib.goe.go.kr/gg/intro/search/index.do`,
    timeout: 20000,
    qs: {
      booktype: 'BOOKANDNONBOOK',
      libraryCodes: lcode,
      rowCount: 1000,
      search_text: etitle,
      viewPage: 1,
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
      const $counter = dom.window.document.querySelector('#search_result > div.research-box > div.search-info > b')
      const count = Number($counter.innerHTML)
      // const $row = dom.window.document.querySelectorAll('.row .book-title')
      const $ = jquery(dom.window)
      const booklist = []
      $('.bif').each((_, a) => {
        const title = $(a).find('.book-title > span').text().trim()
        const rented = $(a).find('.state.typeC').text().trim()
        const libraryName = $(a).find("span:contains('도서관')").next().text().split('|')[0].trim()
        booklist.push({
          libraryName,
          title,
          maxoffset: count,
          exist: rented === '대출가능'
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
