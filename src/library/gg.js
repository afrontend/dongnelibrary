var jsdom = require('jsdom');
var req = require('request');
var _ = require('underscore');
var jquery = require('../dongnelibrary_util.js').getJqueryString();
var global = {};

var libraryList = [
  {code: 'MA', name: '경기도립중앙도서관'},
  {code: 'MB', name: '경기도립평택도서관'},
  {code: 'MC', name: '경기도립광주도서관'},
  {code: 'MD', name: '경기도립여주도서관'},
  {code: 'ME', name: '경기도립포천도서관'},
  {code: 'MF', name: '경기도립김포도서관'}
];

function getLibraryNames() {
  return _.pluck(libraryList, 'name');
}

function getLibraryCode(libraryName) {
  var found = _.find(libraryList, function (lib) {
    return lib.name === libraryName;
  });

  if (found) {
    return found.code;
  }
  return '';
}

function exist(str) {
  return !(str.indexOf('대출중') >= 0)
}

function getOffset(str) {
  var offsetPattern = /javascript:detailview\('(\d+)/g,
      matches,
      offsetList = [];

  while (matches = offsetPattern.exec(str)) {
    offsetList.push(matches[1]);
  }

  return offsetList;
}

function appendOffset(booklist, str) {
  var offsetList = getOffset(str);
  return _.map(booklist, function(item, key){
      item.offset = offsetList[key];
      return item;
  });
}

function makeJsdomCallback(libraryName, body, opt, getBook) {
  return function (errors, window) {
    var booklist = [],
        checkPoint = 0,
        checkPointLimit = 0,
        $ = window.$;

    var maxoffset = $('form:nth-child(1) > table:nth-child(2) > tbody > tr:nth-child(2) > td:nth-child(2)').text().trim();

    maxoffset = parseInt(maxoffset);

    if (maxoffset) {
      opt.maxoffset = maxoffset;
    }

    if (global.debug) {
      console.log('maxoffset: ' + maxoffset);
    }

    var $a = $('body > form:nth-child(1) > form > table > tbody > tr > td > table > tbody > tr');

    _.each($a, function (value) {
        var $value = $(value);
        booklist.push({
            libraryName: libraryName,
            title: $value.find('a').text().trim(),
            maxoffset: maxoffset,
            exist: false
        });
    });

    booklist.shift();
    booklist.shift();

    checkPointLimit = booklist.length;

    appendOffset(booklist, body);

    _.each(booklist, function(book, key) {
        var o = _.clone(opt);
        o.offset = book.offset;
        o.maxoffset = book.maxoffset;
        var index = key;

        searchDetail(o, function (err, exist) {
          checkPoint = checkPoint + 1;
          if (err) {
            exist = false;
          }
          booklist[index].exist = exist;
          if (checkPoint === checkPointLimit) {
            if (getBook) {
              getBook(null, {
                startPage: opt.startPage,
                totalBookCount: maxoffset,
                booklist: booklist
              });
            }
          }
        });
    });

    window.close();
  }
}

function search(opt, getBook) {
  var title = '';
  var libraryName = '';
  var startPage = 1;

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
  var offset = 1;
  var maxoffset = 356;
  var title = '';
  var libraryName = '';

  if (global.debug) {
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
      if (global.debug === true) {
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
              var $a = window.$('table:nth-child(2) > tbody > tr:nth-child(4) > td > table > tbody > tr:nth-child(2) > td.view2_01');
              if (checkExistence) {
                if (global.debug === true) {
                  console.log('$a.text(): ' + $a.text());
                }
                if (exist(($a.text() + "").trim())) {
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
  getLibraryNames: getLibraryNames
};
