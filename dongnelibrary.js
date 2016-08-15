var gg = require('./gg');
var hscity = require('./hscity');
var osan = require('./osan');
var snlib = require('./snlib');
var daum = require('./daum');
var _ = require('underscore');

var dummyLibraryFunction = {
  search: function () {
  },
  exist: function () {
  }
}

var libraryList = [
];

_.each(gg.getLibraryNames(), function (name) {
    libraryList.push({
        name: name,
        fn: gg
    })
});

_.each(hscity.getLibraryNames(), function (name) {
    libraryList.push({
        name: name,
        fn: hscity
    })
});

_.each(osan.getLibraryNames(), function (name) {
    libraryList.push({
        name: name,
        fn: osan
    })
});

_.each(snlib.getLibraryNames(), function (name) {
    libraryList.push({
        name: name,
        fn: snlib
    })
});

function getLibraryNames() {
  return _.pluck(libraryList, 'name');
}

function getLibraryFunction(libraryName) {
  var found = _.find(libraryList, function (lib) {
    return lib.name === libraryName;
  });

  if(found) {
    return found.fn;
  }
  return dummyLibraryFunction;
}

function isValidLibraryName(libraryName) {
  var found = _.find(libraryList, function (lib) {
    return lib.name === libraryName;
  });

  if(found) {
    return true;
  } else {
    return false;
  }
}

function search(opt, callback) {
  if(!opt || !callback) {
    console.log('invalid search options');
    return;
  }

  var lib = dummyLibraryFunction;
  var title = opt.title;
  var libraryName = opt.libraryName;

  if(isValidLibraryName(libraryName)) {
    lib = getLibraryFunction(libraryName);
  } else {
    console.log('invalid Library Name ' + libraryName);
    return;
  }

  lib.search({
      title: title,
      libraryName: libraryName
    }, function (error, booklist) {
      if(error.code !== 0) {
        console.log("error: " + error.msg);
      }
      var books = _.map(booklist, function (book) {
          return {
            libraryName: book.libraryName,
            title: book.title,
            exist: book.exist
          };
      });
      books = _.sortBy(books, function (book) { return !book.exist; });
      if(callback) {
        callback(books);
      }
    }
  );
}

module.exports = {
  search: search,
  getLibraryNames: getLibraryNames
};
