const lib = require("../dist/localLibraryModule/mungyeong");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

createLibraryTestSuite(lib, "문경시립도서관");
