const lib = require("../dist/localLibraryModule/hscity");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

createLibraryTestSuite(lib, "화성시 도서관");
