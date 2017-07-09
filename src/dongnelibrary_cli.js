#!/usr/bin/env node
var dl = require('./dongnelibrary');
var util = require('./dongnelibrary_util');
var program = require('commander');
var _ = require('underscore');
var colors = require('colors');
var async = require('async');

program
  .version('0.1.10')
  .option('-a, --all-library'                 , 'Show all library')
  .option('-j, --json-format'                 , 'JSON format')
  .option('-l, --library-name [value1,value2]', 'Add library name')
  .option('-t, --title [value]'               , 'Add title')
  .parse(process.argv);

function cutTail(str, tail) {
  var result = '';
  var index = str.indexOf(tail);
  if (index === -1) {
    result = str;
  } else {
    result = str.substring(0, index);
  }
  return result;
}

var okMark = '✓ ';
var notokMark = '✖ ';

function printBooks(book) {
  _.each(book.booklist, function (book) {
    console.log(cutTail(book.libraryName, '도서관') + (book.exist?' ' + okMark + ' ':' ' + colors.red(notokMark) + ' ') + book.title + ' ');
  });
}

function printTail(book) {
  var msg = cutTail(book.libraryName, '도서관') + " 모두 " + book.totalBookCount + ' 건';
  if (book.startPage) {
    msg += " (" + book.startPage + " 페이지)";
  }
  console.log(colors.green(msg));
}

function printAllLibraryName(option) {
  var libs = dl.getLibraryNames();
  if (option.jsonFormat) {
    console.log(JSON.stringify(libs, null, 2));
  } else {
    libs.forEach(function (name) {
      console.log(name);
    });
    var msg = "모두 " + libs.length + ' 개의 도서관';
    console.log(colors.green(msg));
  }
}

function getFullLibraryName(str) {
  var names = dl.getLibraryNames()

  var found =  _.find(names, function (name) {
      return name === str;
  });

  if (found) {
    return found;
  }

  found =  _.find(names, function (name) {
      return (name.indexOf(str) >= 0);
  });

  if (found) {
    return found;
  } else {
    return '';
  }
}

function search(title, libraryName, callback) {
  dl.search({
      title: title,
      libraryName: libraryName
    }, function (err, book) {
      if (err) {
        err.msg = err.msg || "Unknown Error";
        if (callback) {
          callback(err);
        }
      } else {
        if (callback) {
          callback(null, book);
        }
      }
    }
  );
}

function getBookCount(results) {
  return _.reduce(results, function (memo, book) {
    var localSum = 0;
    if(book && book.booklist && book.booklist.length) {
      localSum = book.booklist.length;
    }
    return memo + localSum ;
  }, 0);
}

function activate(option) {
  if(!(option.title && option.title.length > 0)) {
    option.title = 'javascript';
  }

  if (option.allLibrary) {
    printAllLibraryName(option);
    return;
  }

  var tasks = [];
  var libs = [];

  if (option.libraryName && option.libraryName.length > 0) {
    libs = _.filter(util.getArrayFromCommaSeparatedStrings(option.libraryName), function (shortLibraryName) {
      if (getFullLibraryName(shortLibraryName) === '') {
        console.log(colors.green("'" + shortLibraryName + "' 도서관은 찾을 수 없습니다."));
        return false;
      } else {
        return true;
      }
    });

    libs = _.map(libs, function (shortLibraryName) {
      return getFullLibraryName(shortLibraryName);
    });
  } else {
    libs = dl.getLibraryNames();
  }

  _.each(libs, function (libraryName) {
    tasks.push(function (callback) {
      search(option.title, libraryName, function (err, book) {
        if (err) {
          console.log(option.libraryName + ", " + option.title + ": " + err.msg);
          callback(null, {});
        } else {
          if (option.jsonFormat) {
            console.log(JSON.stringify(book.booklist, null, 2));
          } else {
            printBooks(book);
          }
          callback(null, book);
        }
      });
    });
  });

  async.parallel(tasks, function (err, results) {
    if (err) {
      getBook({msg: 'Error, Can\'t access detail information'});
    } else {
      console.log(colors.green(results.length + '개의 도서관에서 ' + getBookCount(results) + '권 검색됨.'));
    }
  })
}

activate(program);
