const lib = require("../dist/localLibraryModule/gwangjinsmall");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

// 작은도서관이라 영문 서명 장서가 적다 — "javascript" 는 전 분관 0건, "book" 은 분관마다 7건 이상
createLibraryTestSuite(lib, "광진구립 작은도서관", { englishSearchTerm: "book" });
