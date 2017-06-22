require("dongnelibrary").search({
    title: 'javascript',
    libraryName: '여주'
  }, function (err, book) {
    console.log(book.libraryName + ' "' + book.title + '"');
    book.booklist.forEach(function (book) {
        console.log((book.exist?' ✓  ':' ✖  ') +' '+ book.title);
    });
});
