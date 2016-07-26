require("dongnelibrary").search({
    title: 'javascript',
    libraryName: '남양도서관'
  }, function (books) {
    books.forEach(function (book) {
        console.log(book.title);
    });
});
