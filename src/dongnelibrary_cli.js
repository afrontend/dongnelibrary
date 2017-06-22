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

function print(book) {
  _.each(book.booklist, function (book) {
    console.log(cutTail(book.libraryName, '도서관') + (book.exist?' ✓  ':' ✖  ') + book.title + ' ');
  });
  console.log("startPage: " + book.startPage);
  console.log("totalBookCount: " + book.totalBookCount);
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

function search(title, libraryName, jsonFlag) {
  dl.search({
      title: title,
      libraryName: libraryName
    }, function (err, book) {
      if (err) {
        err.msg = err.msg || "Unknown Error";
        console.log(libraryName + ", " + title + ": " + err.msg);
      } else {
        if (jsonFlag) {
          console.log(JSON.stringify(book.booklist, null, 2));
        } else {
          print(book);
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
    search(options.title, options.libraryName, options.json);
  } else {
    var libs = dl.getLibraryNames();
    _.each(libs, function (libraryName) {
      search(options.title, libraryName, options.json);
    });
  }
}

activate();
