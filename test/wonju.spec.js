const lib = require("../dist/localLibraryModule/wonju");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

createLibraryTestSuite(lib, "원주시립 통합도서관");
