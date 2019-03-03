const _ = require('lodash');
const fp = require('lodash/fp');
const gg = require('./library/gg');
const gunpo = require('./library/gunpo');
const hscity = require('./library/hscity');
const osan = require('./library/osan');
const snlib = require('./library/snlib');
const suwon = require('./library/suwon');
const async = require('async');
const util = require('./dongnelibrary_util.js');

const libraryList = [];

const getLibraryNames = () => (util.getLibraryNames(libraryList));

function makeLibraryList() {
  const library = [
    gg,
    gunpo,
    hscity,
    osan,
    snlib,
    suwon
  ];

  _.each(library, library => {
    _.each(library.getLibraryNames(), name => {
      libraryList.push({
        name,
        search: library.search
      })
    });
  })
}

const getLibraryFunction = libraryName => {
  const found = _.find(libraryList, lib => (lib.name === libraryName));
  return found ? found : {
    search: (opt, getBook) => {
      if (getBook) {
        getBook({msg: 'Unknown library name'});
      }
    },
    name: 'Unknown'
  };
}

function completeLibraryName(str) {
  const found = _.find(getLibraryNames(), name => (name.indexOf(str) >= 0));
  return found ? found : '';
}

function isValidLibraryName(libraryName) {
  const found = _.find(libraryList, lib => (lib.name === libraryName));
  return found ? true : false;
}

function getLibArray(libraryName) {
  let libs = [];
  const libArray = [];

  if (Array.isArray(libraryName)) {
    libs = libraryName;
  } else {
    libs.push(libraryName);
  }
  _.each(libs, name => {
    const fullName = completeLibraryName(name);
    if (isValidLibraryName(fullName)) {
      libArray.push(getLibraryFunction(fullName));
    }
  });

  return libArray;
}

const getSortedBooks = _.flow([
  fp.map(book => ({
    libraryName: book.libraryName,
    title: book.title,
    exist: book.exist
  })),
  fp.sortBy(book => (!book.exist))
]);

function search(opt, getBook, getAllBooks) {
  if (!opt || (!getBook && !getAllBooks)) {
    console.log('invalid search options');
    return;
  }

  const title = opt.title;
  const tasks = [];

  _.each(getLibArray(opt.libraryName), lib => {
    tasks.push(callback => {
      lib.search({
        title: title,
        libraryName: lib.name,
        debug: opt.debug
      }, (err, data) => {
        if (err) {
          if(getBook) {
            getBook(err);
          }
          callback(err);
          return
        }
        if(!data || !data.booklist) {
          if(getBook) {
            getBook({msg: 'invalid Data response'});
          }
          callback({msg: 'invalid Data response'});
          return;
        }

        const bookObj = {
          title: title,
          libraryName: lib.name,
          totalBookCount: data.totalBookCount,
          startPage: data.startPage,
          booklist: getSortedBooks(data.booklist)
        }

        if(getBook) {
          getBook(null, bookObj);
        }
        callback(null, bookObj)
      });
    })
  })

  async.parallel(tasks, (err, results) => {
    if(getAllBooks) {
      if(err) {
        getAllBooks(err);
      } else {
        getAllBooks(null, results);
      }
    }
 })

}

function activate() {
  makeLibraryList();
}

activate();

module.exports = {
  search,
  getLibraryNames
};
