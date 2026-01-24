const dl = require("dongnelibrary");

dl.search({
  title: "javascript",
  libraryName: ["여주", "판교"],
}).then((results) => {
  results.forEach((book) => {
    console.log(book.libraryName + ' "' + book.title + '"');
    book.booklist.forEach((b) => {
      console.log((b.exist ? " ✓  " : " ✖  ") + " " + b.title);
    });
  });
  console.log(results.length + " 개의 도서관을 검색했습니다.");
});
