const lib = require("../dist/localLibraryModule/jongno");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

// 첫 도서관(청운문학도서관)은 문학 특화 장서라 "javascript"·"java" 로 0건이다.
createLibraryTestSuite(lib, "종로구립 도서관", { englishSearchTerm: "story" });
