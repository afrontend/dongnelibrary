const lib = require("../dist/localLibraryModule/bcl");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

createLibraryTestSuite(lib, "부천시립 도서관");
