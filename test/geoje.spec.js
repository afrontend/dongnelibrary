const lib = require("../dist/localLibraryModule/geoje");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

createLibraryTestSuite(lib, "거제시 도서관", { englishSearchTerm: "java" });
