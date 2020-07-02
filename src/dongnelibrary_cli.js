#!/usr/bin/env node
const Configstore = require('configstore');
const _ = require('lodash');
const colors = require('colors');
const figlet = require('figlet');
const fp = require('lodash/fp');
const inquirer = require('inquirer');
const program = require('commander');
const dl = require('./dongnelibrary');
const util = require('./dongnelibrary_util');
const pkg = require('../package.json');

const conf = new Configstore(pkg.name, {});
const getDefaultLibrary = () => (conf.get('library'));
const setDefaultLibrary = (name) => (conf.set('library', name));
const getDefaultTitle = () => (conf.get('title') === undefined ? 'javascript' : conf.get('title'));
const setDefaultTitle = (title) => (conf.set('title', title));

const introMessage = (msg) => {
  console.log(figlet.textSync(msg, {
    font: 'Standard',
    horizontalLayout: 'default',
    verticalLayout: 'default'
  }));
};

program
  .version(pkg.version)
  .option('-a, --library-list', 'display libraries')
  .option('-A, --all', 'use -l, -t')
  .option('-l, --library-name [name,name]', 'library name')
  .option('-t, --title [title]', 'book title')
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

function printAllLibraryName() {
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
};

const processLibraries = (err, results) => {
  if (err) {
    console.log('Error, Can\'t access detail information');
  } else {
    console.log(colors.green(`${results.length} 개의 도서관에서  ${getBookCount(results)} 권 검색됨`));
  }
};

function activate(option) {
  if (option.libraryList) {
    printAllLibraryName(option);
    return;
  }

  if (option.all) {
    search(option, processOneLibrary, processLibraries);
  } else {
    introMessage('Dongne Library');
    inquirer
      .prompt([
        {
          type: 'list',
          name: 'library',
          message: '도서관 이름은?',
          choices: dl.getLibraryNames(),
          default: getDefaultLibrary()
        },
        {
          type: 'input',
          name: 'title',
          message: '책 이름은?',
          default: getDefaultTitle()
        }
      ])
      .then(answers => {
        option.libraryName = answers['library'];
        option.title = answers['title'];
        setDefaultLibrary(option.libraryName);
        setDefaultTitle(option.title);
        if (option.libraryName && option.title) {
          search(option, processOneLibrary, processLibraries);
        }
      });
  }
}

activate(program);
