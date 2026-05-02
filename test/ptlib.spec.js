const lib = require("../dist/localLibraryModule/ptlib");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

createLibraryTestSuite(lib, "평택시 도서관");
