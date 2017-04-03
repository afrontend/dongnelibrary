var jsdom = require('jsdom');
var req = require('request');
var _ = require('underscore');
var jquery = require('./dongnelibrary_util').getJqueryString();

var libraryList = [
  {code: 'MA', name: '남양도서관'},
  {code: 'MB', name: '태안도서관'},
  {code: 'MC', name: '삼괴도서관'},
  {code: 'MD', name: '병점도서관'},
  {code: 'ME', name: '샘내작은도서관'},
  {code: 'MF', name: '두빛나래어린이도서관'},
  {code: 'MG', name: '봉담도서관'},
  {code: 'MH', name: '둥지나래어린이도서관'},
  {code: 'MJ', name: '기아행복마루도서관'},
  {code: 'MK', name: '동탄복합문화센터도서관'},
  {code: 'ML', name: '송산도서관'},
  {code: 'MM', name: '정남도서관'}
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
  return !(str === '관외대출자료');
}

function makeJsdomCallback(libraryName, callback) {
  return function(errors, window) {
    var booklist = [];
    var $ = window.$;
    var $a = $('#wrap > div.data_type5.mb15 > form > table > tbody > tr');
    _.each($a, function (value) {
        var $value = $(value);
        booklist.push({
            libraryName: libraryName,
            title: $value.find('td:nth-child(2) > a').text().trim(),
            exist: exist($value.find('td:nth-child(8)').text().trim())
        });
    });
    if(callback) {
      callback({
          code: 0,
          msg: "No Error"
        }, booklist);
    }
    window.close();
  }
}

function search(opt, callback) {
  var title = 'javascript';
  var libraryName = '남양도서관';

  if(opt.title) {
    title = opt.title;
  }

  if(opt.libraryName) {
    libraryName = opt.libraryName;
  }

  req.post({
      url: 'http://www.hscitylib.or.kr/UnitySearch/unity_library_result.do',
      headers: {
        "User-Agent": 'User-Agent:Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36'
      },
      timeout: 20000,
      form: {
        beforequery: "IAL:" + title + "*",
        sort: 'RK DESC',
        mgc: getLibraryCode(libraryName),
        jongbook: "_book",
        historycount: "0",
        startpage: "1",
        limitpage: "100",
        mode: '0'
      }
    }, function (error, res, body) {
      if (!error && res.statusCode === 200) {
         jsdom.env({
             html: body,
             src: [jquery],
             done: makeJsdomCallback(libraryName, callback)
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

module.exports = {
  search: search,
  getLibraryNames: getLibraryNames
};
