const lib = require("../dist/localLibraryModule/sejong");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

createLibraryTestSuite(lib, "세종시립 도서관", { englishSearchTerm: "java" });
