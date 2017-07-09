var gg = require('./library/gg');
var hscity = require('./library/hscity');
var osan = require('./library/osan');
var snlib = require('./library/snlib');
var suwon = require('./library/suwon');
var _ = require('underscore');

var libraryList = [
];

var dummyLibraryFunction = {
  search: function () {
  },
  exist: function () {
  }
}

function makeLibraryList() {
  var library = [];

  library.push(gg);
  library.push(hscity);
  library.push(osan);
  library.push(snlib);
  library.push(suwon);

  _.each(library, function (library) {
    _.each(library.getLibraryNames(), function (name) {
      libraryList.push({
        name: name,
        fn: library
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
    return found.fn;
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

function search(opt, getBook) {
  if (!opt || !getBook) {
    console.log('invalid search options');
    return;
  }

  var lib = dummyLibraryFunction;
  var title = opt.title;
  var libraryName = completeLibraryName(opt.libraryName);

  if (isValidLibraryName(libraryName)) {
    lib = getLibraryFunction(libraryName);
  } else {
    if (getBook) {
      getBook({msg: 'invalid Library Name ' + libraryName});
    }
    return;
  }

  lib.search({
      title: title,
      libraryName: libraryName
    }, function (err, data) {
      if (err) {
        console.log(libraryName + " '" + title + "', err: " + err.msg);
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
          libraryName: libraryName,
          totalBookCount: data.totalBookCount,
          startPage: data.startPage,
          booklist: books
        });
      }
    }
  );
}

function activate() {
  makeLibraryList();
}

activate();

module.exports = {
  search: search,
  getLibraryNames: getLibraryNames
};
