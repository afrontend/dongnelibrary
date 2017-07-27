var _ = require('underscore');
var gg = require('./library/gg');
var gunpo = require('./library/gunpo');
var hscity = require('./library/hscity');
var osan = require('./library/osan');
var snlib = require('./library/snlib');
var suwon = require('./library/suwon');

var libraryList = [
];

var dummyLibraryFunction = {
  search: function (opt, getBook) {
    if (getBook) {
      getBook({msg: 'Unknown library name'});
    }
  },
  name: 'Unknown'
}

function makeLibraryList() {
  var library = [];

  library.push(gg);
  library.push(gunpo);
  library.push(hscity);
  library.push(osan);
  library.push(snlib);
  library.push(suwon);

  _.each(library, function (library) {
    _.each(library.getLibraryNames(), function (name) {
      libraryList.push({
        name: name,
        search: library.search
      })
    });
  })
}

function getLibraryNames() {
  return _.pluck(libraryList, 'name');
}

function getLibraryFunction(libraryName) {
  var found = _.find(libraryList, function (lib) {
    return lib.name === libraryName;
  });

  if (found) {
    return found;
  }
  return dummyLibraryFunction;
}

function completeLibraryName(str) {
  var names = getLibraryNames()

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

function isValidLibraryName(libraryName) {
  var found = _.find(libraryList, function (lib) {
    return lib.name === libraryName;
  });

  if (found) {
    return true;
  } else {
    return false;
  }
}

function getLibArray(libraryName) {
  var libs = [];
  var libArray = [];

  if (Array.isArray(libraryName)) {
    libs = libraryName;
  } else {
    libs.push(libraryName);
  }
  _.each(libs, function (name) {
    var fullName = completeLibraryName(name);
    if (isValidLibraryName(fullName)) {
      libArray.push(getLibraryFunction(fullName));
    }
  });

  return libArray;
}

function search(opt, getBook) {
  if (!opt || !getBook) {
    console.log('invalid search options');
    return;
  }

  var title = opt.title;

  _.each(getLibArray(opt.libraryName), function (lib) {
    lib.search({
        title: title,
        libraryName: lib.name,
        debug: opt.debug
      }, function (err, data) {
        if (err) {
          console.log(lib.name + " '" + title + "', err: " + err.msg);
          getBook(err);
          return
        }
        if(!data || !data.booklist) {
          getBook({msg: 'invalid Data response'});
          return;
        }

        var books = _.map(data.booklist, function (book) {
            return {
              libraryName: book.libraryName,
              title: book.title,
              exist: book.exist
            };
        });
        books = _.sortBy(books, function (book) { return !book.exist; });
        if (getBook) {
          getBook(null, {
            title: title,
            libraryName: lib.name,
            totalBookCount: data.totalBookCount,
            startPage: data.startPage,
            booklist: books
          });
        }
      }
    );
  })
}

function activate() {
  makeLibraryList();
}

activate();

module.exports = {
  search: search,
  getLibraryNames: getLibraryNames
};
