#!/usr/bin/env node
const _ = require('lodash');
const colors = require('colors');
const fp = require('lodash/fp');
const inquirer = require('inquirer');
const program = require('commander');
const dl = require('./dongnelibrary');
const util = require('./dongnelibrary_util');

program
  .version('0.1.16')
  .option('-a, --all-library', 'display libraries')
  .option('-i, --interactive', 'interactive mode')
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
    msg += ` ( ${book.startPage} 페이지)`;
  }
  console.log(colors.green(msg));
}

function printAllLibraryName(option) {
  const libs = dl.getLibraryNames();
  libs.forEach(name => {
    console.log(name);
  });
  const msg = `모두 ${libs.length} 개의 도서관`;
  console.log(colors.green(msg));
}

const getFullLibraryName = str => _.find(dl.getLibraryNames(), name => (name.indexOf(str) >= 0));

function search(option, bookCallback, allBookCallback) {
  dl.search({
    title: option.title,
    libraryName: getLibraries(option.libraryName)
  }, (err, book) => {
    if (err) {
      err.msg = err.msg || "Unknown Error";
      if (bookCallback) {
        bookCallback(err);
      }
    } else {
      if (bookCallback) {
        bookCallback(null, book);
      }
    }
  }, (err, books) => {
    if (err) {
      err.msg = err.msg || "Unknown Error";
      if (allBookCallback) {
        allBookCallback(err);
      }
    } else {
      if (allBookCallback) {
        allBookCallback(null, books);
      }
    }
  });
}

const getBookCount = (results) => (
  _.reduce(results, (memo, book) => (memo + ((book && book.booklist && book.booklist.length) ? book.booklist.length : 0)), 0)
);

const getLibraryFullNameList = _.flow([
  util.getArrayFromCommaSeparatedString,
  fp.filter(shortLibraryName => (getFullLibraryName(shortLibraryName)))
]);

const getLibraries = (libraryName) => (libraryName ? getLibraryFullNameList(libraryName) : dl.getLibraryNames());

const processOneLibrary = (err, book) => {
  if (err) {
    console.log(err.msg);
  } else {
    printBooks(book);
  }
}

const processLibraries = (err, results) => {
  if (err) {
    console.log('Error, Can\'t access detail information');
  } else {
    console.log(colors.green(`${results.length} 개의 도서관에서  ${getBookCount(results)} 권 검색됨`));
  }
}

function activate(option) {
  if (option.allLibrary) {
    printAllLibraryName(option);
    return;
  }

  if (option.interactive || (!option.libraryName && !option.title)) {
    console.log("interactive");
    inquirer
      .prompt([
        {
          type: 'list',
          name: 'library',
          message: '도서관 이름은?',
          choices: dl.getLibraryNames()
        },
        {
          type: 'input',
          name: 'title',
          message: '책 이름은?',
          default: 'javascript'
        }
      ])
      .then(answers => {
        option.libraryName = answers['library'];
        option.title = answers['title'];
        if (option.libraryName && option.title) {
          search(option, processOneLibrary, processLibraries);
        }
      });
  } else {
    search(option, processOneLibrary, processLibraries);
  }

}

activate(program);
