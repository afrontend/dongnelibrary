const lib = require("../dist/localLibraryModule/wanju");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

// 영문 장서가 적어 "javascript" 는 중앙도서관에서 0건이다
createLibraryTestSuite(lib, "완주군립 도서관", { englishSearchTerm: "english" });
