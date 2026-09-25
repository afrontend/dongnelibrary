const lib = require("../dist/localLibraryModule/jeonju");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

createLibraryTestSuite(lib, "전주시립 도서관");
