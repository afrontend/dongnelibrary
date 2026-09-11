const lib = require("../dist/localLibraryModule/sdm");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

createLibraryTestSuite(lib, "서대문구립 도서관", { englishSearchTerm: "english" });
