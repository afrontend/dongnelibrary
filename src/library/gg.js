const jsdom = require('jsdom');
const req = require('request');
const _ = require('lodash');
const jquery = require('../dongnelibrary_util.js').getJqueryString();
const async = require('async');
const getLibraryNames = require('../dongnelibrary_util.js').getLibraryNames;
const globalDebug = false;

const libraryList = [
  {code: 'MA', name: '경기도립중앙도서관'},
  {code: 'MB', name: '경기도립평택도서관'},
  {code: 'MC', name: '경기도립광주도서관'},
  {code: 'MD', name: '경기도립여주도서관'},
  {code: 'ME', name: '경기도립포천도서관'},
  {code: 'MF', name: '경기도립김포도서관'}
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

function isInTheLibrary(str) {
  return !(str.indexOf('대출중') >= 0);
}

function getOffset(str) {
  const offsetPattern = /javascript:detailview\('(\d+)/g;
  let matches;
  const offsetList = [];

  while (matches = offsetPattern.exec(str)) {
    offsetList.push(matches[1]);
  }

  return offsetList;
}

function appendOffset(booklist, str) {
  const offsetList = getOffset(str);
  return _.map(booklist, function(item, key){
    item.offset = offsetList[key];
    return item;
  });
}

function makeJsdomCallback(libraryName, body, opt, getBook) {
  return function (errors, window) {
    let booklist = [];
    const $ = window.$;
    let maxoffset = $('form:nth-child(1) > table:nth-child(2) > tbody > tr:nth-child(2) > td:nth-child(2)').text().trim();

    if (maxoffset === '검색결과 없음') {
      getBook(null, {
        startPage: opt.startPage,
        totalBookCount: 0,
        booklist: booklist
      });
      return;
    } else {
      maxoffset = parseInt(maxoffset);

      if (maxoffset) {
        opt.maxoffset = maxoffset;
      }
    }

    if (globalDebug) {
      console.log('maxoffset: ' + maxoffset);
    }

    const $a = $('body > form:nth-child(1) > form > table > tbody > tr > td > table > tbody > tr');

    _.each($a, function (value) {
      const $value = $(value);
      booklist.push({
        libraryName: libraryName,
        title: $value.find('a').text().trim(),
        maxoffset: maxoffset,
        exist: false
      });
    });

    booklist.shift();
    booklist.shift();

    appendOffset(booklist, body);

    const tasks = [];

    _.each(booklist, function(book) {
      const o = _.clone(opt);
      o.offset = book.offset;
      o.maxoffset = book.maxoffset;
      tasks.push(function (callback) {
        searchDetail(o, function (err, exist) {
          if (err) {
            exist = false;
          }
          callback(null, exist);
        });
      });
    });

    async.parallel(tasks, function (err, results) {
      if (err) {
        getBook({msg: 'Error, Can\'t access detail information'});
        return;
      }
      if (getBook) {
        booklist = _.map(booklist, function (item, key) {
          item.exist = results[key];
          return item;
        });
        getBook(null, {
          startPage: opt.startPage,
          totalBookCount: maxoffset,
          booklist: booklist
        });
      }
    });

    window.close();
  };
}

function search(opt, getBook) {
  let title = '';
  let libraryName = '';
  let startPage = 1;

  if (opt.debug) {
    globalDebug = true;
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

  req.post({
    url: 'http://www.gglib.or.kr:8081/kolas3_02/BookSearch/search_result.do',
    timeout: 20000,
    form: {
      jongbook: '',
      value2: '',
      value3: '',
      buhovalue1: '',
      buhovalue2: '',
      buhovalue3: '',
      buhovalue4: '',
      field1: 'IAL',
      value1: title,
      sort: 'RK DESC',
      msa: '',
      formclass: '',
      textlang: '',
      simplelang: '',
      startyear: '',
      endyear: '',
      limitpage: 10,
      local: '',
      startpage: startPage,
      mode: 0,
      mgc: getLibraryCode(libraryName)
    }
  }, function (err, res, body) {
    if (globalDebug === true) {
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
        done: makeJsdomCallback(libraryName, body, _.clone(opt), getBook)
      });
    }
  }
  );
}

function searchDetail(opt, checkExistence) {
  let offset = 1;
  let maxoffset = 356;
  let title = '';
  let libraryName = '';

  if (globalDebug) {
    console.log('opt: ' + JSON.stringify(opt, null, 2));
  }

  if (opt.offset) {
    offset = opt.offset;
  }

  if (opt.maxoffset) {
    maxoffset = opt.maxoffset;
  }

  if (opt.title) {
    title = opt.title;
  } else {
    if (checkExistence) {
      checkExistence({msg: 'Need a book name'});
    }
    return;
  }

  if (opt.libraryName) {
    libraryName = opt.libraryName;
  } else {
    if (checkExistence) {
      checkExistence({msg: 'Need a library name'});
    }
    return;
  }

  req.post({
    url: 'http://www.gglib.or.kr:8081/kolas3_01/BookSearch/detailview_result.do',
    timeout: 20000,
    form: {
      sort: 'RK DESC',
      beforequery: 'IAL:'+title.toUpperCase()+'* AND MGC:' + getLibraryCode(libraryName),
      msa: 'M',
      offset: offset,
      maxoffset: maxoffset,
      jongbook: '',
      historycount: 0,
      book_code: ''
    }
  }, function (err, res, body) {
    if (globalDebug === true) {
      console.log(body);
    }
    if (err) {
      if (checkExistence) {
        checkExistence({msg: err});
      }
    } else {
      jsdom.env({
        html: body,
        src: [jquery],
        done: function (errors, window) {
          const $a = window.$('table:nth-child(2) > tbody > tr:nth-child(4) > td > table > tbody > tr:nth-child(2) > td.view2_01');
          if (checkExistence) {
            if (globalDebug === true) {
              console.log('$a.text(): ' + $a.text());
            }
            if (isInTheLibrary(($a.text() + "").trim())) {
              checkExistence(null, true);
            } else {
              checkExistence(null, false);
            }
          }

          window.close();
        }
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
