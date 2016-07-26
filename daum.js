var url = require('url');
var req = require('request');
var _ = require('underscore');
var util = require('./dongnelibrary_util.js');

var APIKEY = process.env.DAUM_APIKEY || '';

var libraryList = [
  {code: '', name: 'DAUM'},
];

function getLibraryNames() {
  return _.pluck(libraryList, 'name');
}

function search(opt, callback) {
  var title = 'javascript';

  if(opt.title) {
    title = opt.title;
  }

  var options = {
    protocol: "http:",
    host: 'apis.daum.net',
    pathname: '/search/book',
    timeout: 10000,
    query: {
      apikey: APIKEY,
      output: 'json',
      result: '10',
      searchType: 'all',
      pageno: 1,
      q: title
    }
  };

  if(APIKEY === '') {
    if(callback) {
      callback({
          code: 2,
          msg: 'no DAUM_APIKEY'
        },[]);
    }
    console.log("Please set DAUM_APIKEY shell variable to use 'https://apis.daum.net/search/book'");
    return;
  }

  var bookUrl = url.format(options);
  req.get(bookUrl, {timeout: 10000}, function (error, res, body) {
      if (!error && res.statusCode === 200) {
        var booklist = _.map(JSON.parse(body).channel.item, function (book) {
            return {
              'isbn': book.isbn13,
              'barcode': book.barcode,
              'html': '',
              'libraryName': 'DAUM',
              'title': util.stripTags(book.title),
              'price': book.list_price,
              'author': book.author,
              'translator': book.translator,
              'publisher': book.pub_nm,
              'publish_date': book.pub_date,
              'description': book.description,
              'exist': false
            };
        });
        if(callback) {
          callback({
              code: 0,
              msg: "No Error"
            }, booklist);
        }
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

