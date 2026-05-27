const lib = require("../dist/localLibraryModule/goyanglib");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

createLibraryTestSuite(lib, "고양시 도서관");
