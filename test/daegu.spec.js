const lib = require("../dist/localLibraryModule/daegu");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

// WAF가 "javascript" 키워드를 차단하므로 "java"로 대체
createLibraryTestSuite(lib, "대구광역시통합도서관", { englishSearchTerm: "java" });
