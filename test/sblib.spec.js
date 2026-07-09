const lib = require("../dist/localLibraryModule/sblib");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

createLibraryTestSuite(lib, "성북구립도서관");
