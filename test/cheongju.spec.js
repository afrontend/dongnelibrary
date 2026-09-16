const lib = require("../dist/localLibraryModule/cheongju");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

// "javascript" 는 XSS 필터에 걸려 검색어가 통째로 제거된 채 전체 장서가 반환된다.
createLibraryTestSuite(lib, "청주시립 도서관", { englishSearchTerm: "java" });
