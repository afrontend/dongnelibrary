const lib = require("../dist/localLibraryModule/dongjak");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

createLibraryTestSuite(lib, "동작구통합도서관");
