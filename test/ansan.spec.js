const lib = require("../dist/localLibraryModule/ansan");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

createLibraryTestSuite(lib, "안산시 도서관");
