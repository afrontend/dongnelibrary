const lib = require("../dist/localLibraryModule/changwon");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

createLibraryTestSuite(lib, "창원시 도서관");
