const lib = require("../dist/localLibraryModule/djdonggu");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

createLibraryTestSuite(lib, "대전동구 공공도서관");
