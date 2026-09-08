const lib = require("../dist/localLibraryModule/saha");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

// WAF가 "javascript" 검색어를 차단함 (비정상적인 파라메터 alert 응답)
createLibraryTestSuite(lib, "사하구 도서관", { englishSearchTerm: "java" });
