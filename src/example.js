require("dongnelibrary").search({
    title: 'javascript',
    libraryName: '남양도서관'
  }, function (err, book) {
    book.booklist.forEach(function (book) {
        console.log((book.exist?' ✓  ':' ✖  ') +' '+ book.title);
    });
});
