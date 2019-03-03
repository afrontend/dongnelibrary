#!/usr/bin/env node
const _ = require('lodash');
const fp = require('lodash/fp');
const async = require('async');
const colors = require('colors');
const program = require('commander');
const dl = require('./dongnelibrary');
const util = require('./dongnelibrary_util');

program
  .version('0.1.16')
  .option('-a, --all-library', 'display libraries')
  .option('-j, --json-format', 'JSON format')
  .option('-l, --library-name [value1,value2]', 'library name')
  .option('-t, --title [value]', 'book title')
  .parse(process.argv);

function cutTail(str, tail) {
  let result = '';
  const index = str.indexOf(tail);
  if (index === -1) {
    result = str;
  } else {
    result = str.substring(0, index);
  }
  return result;
}

const okMark = '✓ ';
const notokMark = '✖ ';

function printBooks(book) {
  _.each(book.booklist, book => {
    console.log(cutTail(book.libraryName, '도서관') + (book.exist?' ' + okMark + ' ':' ' + colors.red(notokMark) + ' ') + book.title + ' ');
  });
}

function printTail(book) {
  let msg = cutTail(book.libraryName, '도서관') + " 모두 " + book.totalBookCount + ' 건';
  if (book.startPage) {
    msg += " (" + book.startPage + " 페이지)";
  }
  console.log(colors.green(msg));
}

function printAllLibraryName(option) {
  const libs = dl.getLibraryNames();
  if (option.jsonFormat) {
    console.log(JSON.stringify(libs, null, 2));
  } else {
    libs.forEach(name => {
      console.log(name);
    });
    const msg = "모두 " + libs.length + ' 개의 도서관';
    console.log(colors.green(msg));
  }
}

function getFullLibraryName(str) {
  const found =  _.find(dl.getLibraryNames(), name => (name.indexOf(str) >= 0));
  return found ? found : '';
}

function search(title, libraryName, callback) {
  dl.search({
    title,
    libraryName
  }, (err, book) => {
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
  });
}

function getBookCount(results) {
  return _.reduce(results, (memo, book) => {
    let localSum = 0;
    if(book && book.booklist && book.booklist.length) {
      localSum = book.booklist.length;
    }
    return memo + localSum;
  }, 0);
}

const getLibraryFullNameList = _.flow([
  util.getArrayFromCommaSeparatedString,
  fp.filter(shortLibraryName => (getFullLibraryName(shortLibraryName)))
]);

function activate(option) {
  option.title = option.title || 'javascript';

  if (option.allLibrary) {
    printAllLibraryName(option);
    return;
  }

  const tasks = [];
  const libs = option.libraryName ? getLibraryFullNameList(option.libraryName) : dl.getLibraryNames();

  _.each(libs, libraryName => {
    tasks.push(function (callback) {
      search(option.title, libraryName, (err, book) => {
        if (err) {
          console.log(`${option.libraryName} ,  ${option.title} :  ${err.msg}`);
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

  async.parallel(tasks, (err, results) => {
    if (err) {
      getBook({msg: 'Error, Can\'t access detail information'});
    } else {
      console.log(colors.green(`${results.length} 개의 도서관에서  ${getBookCount(results)} 권 검색됨`));
    }
  })
}

activate(program);
