const lib = require("../dist/localLibraryModule/gangnam");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

createLibraryTestSuite(lib, "강남구 통합도서관");
