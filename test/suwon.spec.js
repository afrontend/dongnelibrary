const lib = require("../dist/localLibraryModule/suwon");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

createLibraryTestSuite(lib, "수원시 도서관");
