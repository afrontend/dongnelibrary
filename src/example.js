const dl = require('dongnelibrary');
dl.search({
  title: 'javascript',
  libraryName: ['여주','판교']
}, function (err, book) {
  console.log(book.libraryName + ' "' + book.title + '"');
  book.booklist.forEach(function (book) {
    console.log((book.exist?' ✓  ':' ✖  ') +' '+ book.title);
  });
}, function (err, books) {
  console.log(books.length + ' 개의 도서관을 검색했습니다.');
});




