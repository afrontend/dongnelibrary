const lib = require("../dist/localLibraryModule/yangcheon");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

createLibraryTestSuite(lib, "양천구 도서관", { englishSearchTerm: "java" });
