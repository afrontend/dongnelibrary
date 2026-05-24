const lib = require("../dist/localLibraryModule/paju");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

createLibraryTestSuite(lib, "파주시도서관");
