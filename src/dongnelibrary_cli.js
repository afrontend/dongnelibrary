#!/usr/bin/env node
var dl = require('./dongnelibrary');
var cli = require('cli');
var _ = require('underscore');
var options = cli.parse({
    title:       [ 't', ' A book title'  , 'string', 'javascript' ],
    libraryName: [ 'l', ' A library name', 'string', '' ],
    json:        [ 'j', ' JSON format'   , 'bool'  , false ]
});

function cutTail(str, tail) {
  var result = '';
  var index = str.indexOf("도서관");
  if (index === -1) {
    result = str;
  } else {
    result = str.substring(0, index);
  }
  return result;
}

function printBooks(book) {
  _.each(book.booklist, function (book) {
    console.log(cutTail(book.libraryName, '도서관') + (book.exist?' ✓  ':' ✖  ') + book.title + ' ');
  });
}

function printTail(book) {
  var msg = cutTail(book.libraryName, '도서관') + " 모두 " + book.totalBookCount + ' 건';
  if (book.startPage) {
    msg += " (" + book.startPage + " 페이지)";
  }
  console.log(msg);
}

function complete(str) {
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

function printLibraryNames(libraryName) {
  _.each(dl.getLibraryNames(), function (name) {
      console.log(((name === libraryName)?'❯ ':'  ') + name + ' ');
  });
  console.log("Searching...("+options.title+")" );
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

function activate() {
  if (options.libraryName && options.libraryName.length > 0) {
    options.libraryName = complete(options.libraryName);
    if (options.libraryName) {
      if (!options.json) {
        printLibraryNames(options.libraryName);
      }
    }
    search(options.title, options.libraryName, function (err, book) {
      if (err) {
        console.log(libraryName + ", " + title + ": " + err.msg);
      } else {
        if (options.json) {
          console.log(JSON.stringify(book.booklist, null, 2));
        } else {
          printBooks(book);
          printTail(book);
        }
      }
    });
  } else {
    var checkPoint = 0,
      checkPointLimit = 0,
      bookCount = 0;

    var libs = dl.getLibraryNames();
    checkPointLimit = libs.length;
    _.each(libs, function (libraryName) {
      search(options.title, libraryName, function (err, book) {
        checkPoint = checkPoint + 1;
        if (err) {
          console.log(libraryName + ", " + title + ": " + err.msg);
        } else {
          if (options.json) {
            console.log(JSON.stringify(book.booklist, null, 2));
          } else {
            printBooks(book);
            bookCount += book.booklist.length;
          }
        }
        if (checkPoint === checkPointLimit) {
          console.log("모든 도서관에서 " + bookCount + "권 검색됨.");
        }
      });
    });
  }
}

activate();
