const lib = require("../dist/localLibraryModule/pohang");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

createLibraryTestSuite(lib, "포항시립도서관");
