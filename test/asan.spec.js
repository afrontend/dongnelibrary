const lib = require("../dist/localLibraryModule/asan");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

createLibraryTestSuite(lib, "아산시 도서관");
