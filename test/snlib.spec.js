const lib = require("../dist/localLibraryModule/snlib");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

createLibraryTestSuite(lib, "성남시 도서관");
