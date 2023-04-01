const getLibraryNames = require('../dongnelibrary_util.js').getLibraryNames;
const jquery = require('jquery');
const req = require('request')
const { JSDOM } = require("jsdom");

const libraryList = [
  {code: 'MA', name: '남양도서관'},
  {code: 'MB', name: '태안도서관'},
  {code: 'MC', name: '삼괴도서관'},
  {code: 'MD', name: '병점도서관'},
  {code: 'ME', name: '샘내도서관'},
  {code: 'MF', name: '두빛나래도서관'},
  {code: 'MG', name: '봉담도서관'},
  {code: 'MH', name: '둥지나래도서관'},
  {code: 'MI', name: '목동이음터도서관'},
  {code: 'MJ', name: '기아행복마루도서관'},
  {code: 'MK', name: '동탄복합문화센터도서관'},
  {code: 'ML', name: '송산도서관'},
  {code: 'MM', name: '정남도서관'},
  {code: 'MN', name: '비봉도서관'},
  {code: 'MO', name: '진안도서관'},
  {code: 'MP', name: '중앙이음터도서관'},
  {code: 'MQ', name: '양감도서관'},
  {code: 'MR', name: '다원이음터도서관'},
  {code: 'MS', name: '송린이음터도서관'},
  {code: 'MT', name: '팔탄도서관'},
  {code: 'MU', name: '마도도서관'},
  {code: 'MV', name: '봉담커피앤북도서관'},
  {code: 'MW', name: '왕배푸른숲도서관'},
  {code: 'MX', name: '노을빛도서관'},
  {code: 'MY', name: '서연이음터도서관'},
  {code: 'MZ', name: '호연이음터도서관'},
  {code: 'TA', name: '늘봄이음터도서관'},
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

  const lcode = getLibraryCode(libraryName)
  const etitle = encodeURIComponent(title)
  // const url=`https://hscitylib.or.kr/intro/menu/10008/program/30001/searchResultList.do?searchType=SIMPLE&searchManageCodeArr=MK&searchKeyword=javascript`
  const url=`https://hscitylib.or.kr/intro/menu/10008/program/30001/searchResultList.do`
  req.post({
    url,
    timeout: 20000,
    headers: {
      "User-Agent": 'User-Agent:Mozilla/5.0 (X11 Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36'
    },
    form: {
      searchType: 'SIMPLE',
      searchKeyword: etitle,
      searchManageCodeArr: lcode,
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
        getBook({msg});
      }
    } else {
      const dom = new JSDOM(body);
      const count = dom.window.document.querySelector('#totalCnt').innerHTML.match(/\d+/)[0]
      const $ = jquery(dom.window)
      const booklist = []
      $('.bookArea').each((_, a) => {
        const title = $(a).find('p.book_name.kor.on > a').attr('title')
        const rented = $(a).find('span.emp8').text().trim()
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
