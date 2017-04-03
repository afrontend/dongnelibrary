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

  if(found) {
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

function makeJsdomCallback(libraryName, body, opt, callback) {
  return function (errors, window) {
    var maxoffsetPattern = /^(\d+).*/,
        matches,
        maxoffset = 0,
        maxoffsetStr = '',
        booklist = [],
        $ = window.$;

    maxoffsetStr = $('form:nth-child(1) > table:nth-child(2) > tbody > tr:nth-child(2) > td:nth-child(2)').text().trim();

    matches = maxoffsetPattern.exec(maxoffsetStr);
    if(matches) {
      maxoffset = matches[1];
    }

    if (maxoffset) {
      opt.maxoffset = maxoffset;
    }

    if (global.debug) {
      console.log('maxoffset: ' + maxoffset);
    }

    var $a = $('body > form:nth-child(1) > form > table > tbody > tr > td > table > tbody > tr');
    var checkPoint = 0;
    var checkPointLimit = 0;

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

        searchDetail(o, function (exist) {
            booklist[index].exist = exist;
            checkPoint = checkPoint + 1;
            if(checkPoint === checkPointLimit) {
              if(callback) {
                callback({
                    code: 0,
                    msg: "No Error"
                  }, booklist);
              }
            }
        });
    });

    window.close();
  }
}

function search(opt, callback) {
  var booklist = [];
  var title = 'javascript';
  var libraryName = '경기도립중앙도서관';
  var startpage = 1;

  if(opt.debug) {
    global.debug = true;
  }

  if(opt.title) {
    title = opt.title;
  }

  if(opt.libraryName) {
    libraryName = opt.libraryName;
  }

  if(opt.startpage) {
    startpage = opt.startpage;
  }

  req.post({
      url: 'http://www.gglib.or.kr:8081/kolas3_02/BookSearch/search_result.do',
      timeout: 20000,
      form: {
         jongbook:'',
         value2:'',
         value3:'',
         buhovalue1:'',
         buhovalue2:'',
         buhovalue3:'',
         buhovalue4:'',
         field1:'IAL',
         value1: title,
         sort:'RK DESC',
         msa:'',
         formclass:'',
         textlang:'',
         simplelang:'',
         startyear:'',
         endyear:'',
         limitpage:10,
         local:'',
         startpage: startpage,
         mode:0,
         mgc: getLibraryCode(libraryName)
       }
    }, function (error, res, body) {
      if(global.debug === true) {
        console.log(body);
      }
      if (!error && res.statusCode === 200) {
        jsdom.env({
            html: body,
            src: [jquery],
            done: makeJsdomCallback(libraryName, body, _.clone(opt), callback)
        });
      } else {
        var msg = 'Error';
        if(error) {
          msg = error;
        }

        if(res && res.statusCode) {
          msg = msg + " HTTP return code ("+res.statusCode+")";
        }

        if(callback) {
          callback({
              code: 1,
              msg: msg
            }, []);
        }
      }
    }
  );
}

function searchDetail(opt, callback) {
  var booklist = [];
  var offset = 1;
  var maxoffset = 356;
  var title = 'javascript';
  var libraryName = '경기도립중앙도서관';

  if (global.debug) {
    console.log('opt: ' + JSON.stringify(opt, null, 2));
  }

  if(opt.offset) {
    offset = opt.offset;
  }

  if(opt.maxoffset) {
    maxoffset = opt.maxoffset;
  }

  if(opt.title) {
    title = opt.title;
  }

  if(opt.libraryName) {
    libraryName = opt.libraryName;
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
    }, function (error, res, body) {
      if(global.debug === true) {
        console.log(body);
      }
      if (!error && res.statusCode === 200) {
        jsdom.env({
            html: body,
            src: [jquery],
            done: function (errors, window) {
              var $a = window.$('table:nth-child(2) > tbody > tr:nth-child(4) > td > table > tbody > tr:nth-child(2) > td.view2_01');
              if(callback) {
                //console.log('$a.text(): ' + $a.text());
                if(exist(($a.text() + "").trim())) {
                  callback(true);
                } else {
                  callback(false);
                }
              }

              window.close();
            }
        });
      } else {
        var msg = 'Error';
        if(error) {
          msg = error;
        }

        if(res && res.statusCode) {
          msg = msg + " HTTP return code ("+res.statusCode+")";
        }

        if(callback) {
          callback(false);
        }
      }
    }
  );
}

module.exports = {
  search: search,
  getLibraryNames: getLibraryNames
};
