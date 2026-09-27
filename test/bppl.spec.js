const lib = require("../dist/localLibraryModule/bppl");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

createLibraryTestSuite(lib, "부평구립 도서관");
