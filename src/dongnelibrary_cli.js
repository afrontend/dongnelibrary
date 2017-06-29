#!/usr/bin/env node
var dl = require('./dongnelibrary');
var program = require('commander');
var _ = require('underscore');

program
  .version('0.1.7')
  .option('-t, --title [value]'       , 'Add title')
  .option('-l, --library-name [value]', 'Add library name')
  .option('-j, --json-format'         , 'JSON format')
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
  console.log("Searching...("+program.title+")" );
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
  if (program.libraryName && program.libraryName.length > 0) {
    program.libraryName = complete(program.libraryName);
    if (program.libraryName) {
      if (!program.jsonFormat) {
        printLibraryNames(program.libraryName);
      }
    }
    search(program.title || 'javascript', program.libraryName, function (err, book) {
      if (err) {
        console.log(libraryName + ", " + program.title + ": " + err.msg);
      } else {
        if (program.jsonFormat) {
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
      search(program.title || 'javascript', libraryName, function (err, book) {
        checkPoint = checkPoint + 1;
        if (err) {
          console.log(libraryName + ", " + program.title + ": " + err.msg);
        } else {
          if (program.jsonFormat) {
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
