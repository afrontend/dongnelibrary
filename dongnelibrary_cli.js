#!/usr/bin/env node
var dongnelibrary = require('./dongnelibrary');
var cli = require('cli');
var _ = require('underscore');
var options = cli.parse({
    title: [ 't', 'book title', 'string', 'javascript' ],
    libraryName: [ 'l', 'library name', 'string', '남양도서관' ]
});

function print(book) {
  console.log(book.libraryName + (book.exist?' ✓  ':'    ') + book.title + ' ');
}

function complete(str) {
  var names = dongnelibrary.getLibraryNames()

  var found =  _.find(names, function (name) {
      return name === str;
  });

  if(found) {
    return found;
  }

  found =  _.find(names, function (name) {
      return (name.indexOf(str) >= 0);
  });

  if(found) {
    return found;
  } else {
    return '';
  }
}

function printLibraryNames(libraryName) {
  _.each(dongnelibrary.getLibraryNames(), function (name) {
      console.log(((name === libraryName)?'❯ ':'  ') + name + ' ');
  });
  console.log("Searching...("+options.title+")" );
}

options.libraryName = complete(options.libraryName);

if(options.libraryName) {
  printLibraryNames(options.libraryName);
}

dongnelibrary.search({
    title: options.title,
    libraryName: options.libraryName
  }, function (books) {
    _.each(books, function (book) {
        print(book);
    });
  }
);
