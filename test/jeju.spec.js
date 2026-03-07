const lib = require("../dist/localLibraryModule/jeju");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

createLibraryTestSuite(lib, "제주시 도서관");
