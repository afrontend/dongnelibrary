const { get } = require("../http");
const _ = require("lodash");
const {
  getLibraryNames,
  createLibraryCodeLookup,
  validateSearchOptions,
  wrapWithCallback,
} = require("../util.js");

const homeUrl = "https://www.gunpolib.go.kr";

const libraryList = [
  { code: "1", name: "산본도서관" },
  { code: "2", name: "당동도서관" },
  { code: "3", name: "대야도서관" },
  { code: "4", name: "어린이도서관" },
  { code: "5", name: "이동도서관" },
  { code: "6", name: "군포중앙도서관" },
  { code: "7", name: "누리천문대" },
  { code: "8", name: "시청북카페밥상머리" },
  { code: "9", name: "부곡도서관" },
  { code: "10", name: "당정문화도서관" },
  { code: "11", name: "동화나무어린이도서관" },
  { code: "12", name: "금정작은도서관" },
  { code: "13", name: "재궁꿈나무도서관" },
  { code: "14", name: "궁내동작은도서관" },
  { code: "15", name: "노루목작은도서관" },
  { code: "16", name: "버드나무에부는바람작은도서관" },
  { code: "17", name: "꿈쟁이도서관" },
  { code: "18", name: "우리마을도서관" },
  { code: "19", name: "북카페사랑아이엔지" },
  { code: "20", name: "산본역도서관" },
  { code: "21", name: "하늘정원작은도서관" },
  { code: "22", name: "꿈이지" },
  { code: "23", name: "꿈드림작은도서관" },
  { code: "24", name: "여담작은도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

function getBookList(json) {
  return _.map(json.data ? json.data.list : [], function (book) {
    return {
      title: book.titleStatement,
      exist: book.branchVolumes.some((vol) => vol.cState.includes("대출가능")),
      libraryName: book.branchVolumes.map((vol) => vol.name).join(","),
      bookUrl: book.id
        ? `https://www.gunpolib.go.kr/#/search/detail/${book.id}`
        : "",
    };
  });
}

/**
 * Search for books in Gunpo City Libraries.
 * @param {Object} opt - Search options.
 * @param {string} opt.title - Book title to search for.
 * @param {string} opt.libraryName - Library name to search in.
 * @returns {Promise<Object>} Search result with totalBookCount and booklist.
 */
async function searchImpl(opt) {
  const { title, libraryName } = opt;

  validateSearchOptions(opt);

  const branch = getLibraryCode(libraryName);

  const { statusCode, body } = await get(
    "https://www.gunpolib.go.kr/pyxis-api/1/collections/1/search",
    {
      qs: {
        all: `k|a|${title}`,
        branch,
        max: 1000,
      },
    },
  );

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const booklist = getBookList(JSON.parse(body));
  return {
    totalBookCount: booklist.length,
    booklist,
  };
}

const search = wrapWithCallback(searchImpl);

module.exports = {
  search,
  homeUrl,
  getLibraryNames: function () {
    return getLibraryNames(libraryList);
  },
};
