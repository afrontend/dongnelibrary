const lib = require("../dist/localLibraryModule/siheung");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

createLibraryTestSuite(lib, "시흥시 도서관");
