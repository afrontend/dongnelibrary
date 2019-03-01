const _ = require('lodash');
const gg = require('./library/gg');
const gunpo = require('./library/gunpo');
const hscity = require('./library/hscity');
const osan = require('./library/osan');
const snlib = require('./library/snlib');
const suwon = require('./library/suwon');
const async = require('async');
const util = require('./dongnelibrary_util.js');

const libraryList = [
];

const dummyLibraryFunction = {
  search: function (opt, getBook) {
    if (getBook) {
      getBook({msg: 'Unknown library name'});
    }
  },
  name: 'Unknown'
}

function makeLibraryList() {
  const library = [];

  library.push(gg);
  library.push(gunpo);
  library.push(hscity);
  library.push(osan);
  library.push(snlib);
  library.push(suwon);

  _.each(library, library => {
    _.each(library.getLibraryNames(), name => {
      libraryList.push({
        name: name,
        search: library.search
      })
    });
  })
}

const getLibraryNames = () => (util.getLibraryNames(libraryList));

const getLibraryFunction = libraryName => {
  const found = _.find(libraryList, lib => {
    return lib.name === libraryName;
  });

  if (found) {
    return found;
  }
  return dummyLibraryFunction;
}

function completeLibraryName(str) {
  const names = getLibraryNames()

  let found =  _.find(names, name => {
      return name === str;
  });

  if (found) {
    return found;
  }

  found =  _.find(names, name => {
      return (name.indexOf(str) >= 0);
  });

  if (found) {
    return found;
  } else {
    return '';
  }
}

function isValidLibraryName(libraryName) {
  const found = _.find(libraryList, lib => {
    return lib.name === libraryName;
  });

  if (found) {
    return true;
  } else {
    return false;
  }
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
          getBook({msg: 'invalid Data response'});
          return;
        }

        let books = _.map(data.booklist, book => {
          return {
            libraryName: book.libraryName,
            title: book.title,
            exist: book.exist
          };
        });

        books = _.sortBy(books, book => (!book.exist));

        const bookObj = {
          title: title,
          libraryName: lib.name,
          totalBookCount: data.totalBookCount,
          startPage: data.startPage,
          booklist: books
        }
        if (getBook) {
          getBook(null, bookObj);
        }

        if(callback) {
          callback(null, bookObj)
        }
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
  search: search,
  getLibraryNames: () => (getLibraryNames(libraryList))
};
