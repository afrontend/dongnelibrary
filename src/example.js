require("dongnelibrary").search({
    title: 'javascript',
    libraryName: '남양도서관'
  }, function (books) {
    books.forEach(function (book) {
        console.log((book.exist?'책있음':'책없음') +' '+ book.title);
    });
});
