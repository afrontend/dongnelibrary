const DEBUG = true;
const _ = require('lodash');
const getLibraryNames = require('../dongnelibrary_util.js').getLibraryNames;
// const jquery = require('../dongnelibrary_util.js').getJqueryString();
const { JSDOM } = require("jsdom");
const req = require('request')
const jquery = require('jquery');


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

function isRented(str) {
  return !(str.indexOf('대출중') >= 0);
}

function jsdomCB(libraryName, body, opt, getBook) {
  return function (errors, window) {
    let booklist = [];
    const $ = window.$;
    // let count = $('#search_result > div.research-box > div.search-info > b').text().trim();
    let count = $('.row').length
    console.log('count', count)
    getBook({msg: 'Need a book name'});
    return;

    if (count === null) {
      getBook(null, {
        startPage: opt.startPage,
        totalBookCount: 0,
        booklist: booklist
      });
      return;
    } else {
      count = parseInt(count);

      if (count) {
        opt.count = count;
      }
    }

    if (DEBUG) {
      console.log('count: ' + count);
    }

    const $a = $('.row');

    _.each($a, function (value) {
      const $value = $(value);
      booklist.push({
        libraryName,
        title: $value.find('.book-title').text().trim(),
        maxoffset: count,
        exist: false
      });
    });

    window.close();
  };
}

function search(opt, getBook) {
  console.log('opt', opt)
  let title = '';
  let libraryName = '';
  let startPage = 1;

  if (opt.debug) {
    DEBUG = true;
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

  if (opt.startPage) {
    startPage = opt.startPage;
  }

  // 'https://lib.goe.go.kr/gg/intro/search/index.do?menu_idx=10&viewPage=1&search_text=%EC%9E%90%EB%B0%94%EC%8A%A4%ED%81%AC%EB%A6%BD%ED%8A%B8&booktype=BOOKANDNONBOOK&libraryCodes=MA&sortField=NONE&sortType=ASC&rowCount=1000#search_result',
  const lcode = getLibraryCode(libraryName)
  req.get({
    url: `https://lib.goe.go.kr/gg/intro/search/index.do?menu_idx=10&viewPage=1&search_text=%EC%9E%90%EB%B0%94%EC%8A%A4%ED%81%AC%EB%A6%BD%ED%8A%B8&booktype=BOOKANDNONBOOK&libraryCodes=${lcode}&sortField=NONE&sortType=ASC&rowCount=1000#search_result`,
    timeout: 20000,
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
      // console.log(body)
      const dom = new JSDOM(body);
      const $counter = dom.window.document.querySelector('#search_result > div.research-box > div.search-info > b')
      const count = Number($counter.innerHTML)
      // const $row = dom.window.document.querySelectorAll('.row .book-title')
      const $ = jquery(dom.window)
      const booklist = []
      $('.row .book-title > span').each((_, a) => {
        const title = $(a).text().trim()
        console.log('apple', '"' + title  + '"');
        booklist.push({
          libraryName,
          title,
          maxoffset: count,
          exist: false
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
