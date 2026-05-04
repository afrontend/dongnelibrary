const lib = require("../dist/localLibraryModule/hanamlib");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

createLibraryTestSuite(lib, "하남시 도서관");
