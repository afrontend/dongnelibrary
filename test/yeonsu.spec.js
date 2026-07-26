const lib = require("../dist/localLibraryModule/yeonsu");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

createLibraryTestSuite(lib, "연수구립 도서관");
