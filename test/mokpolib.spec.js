const lib = require("../dist/localLibraryModule/mokpolib");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

createLibraryTestSuite(lib, "목포시통합도서관");
