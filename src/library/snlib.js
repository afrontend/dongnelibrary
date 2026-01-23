const {
  getLibraryNames,
  createLibraryCodeLookup,
  validateSearchOptions,
} = require("../util.js");
const jquery = require("jquery");
const { get } = require("../http");
const { JSDOM } = require("jsdom");

const homeUrl = "https://www.snlib.go.kr";

const libraryList = [
  { code: "BF", name: "논골도서관" },
  { code: "CK", name: "중원어린이도서관" },
  { code: "MA", name: "성남중앙도서관" },
  { code: "MB", name: "분당도서관" },
  { code: "MD", name: "고등도서관" },
  { code: "MG", name: "구미도서관" },
  { code: "MH", name: "해오름도서관" },
  { code: "MJ", name: "중원도서관" },
  { code: "MM", name: "무지개도서관" },
  { code: "MO", name: "수내도서관" },
  { code: "MP", name: "판교도서관" },
  { code: "MR", name: "위례도서관" },
  { code: "MS", name: "수정도서관" },
  { code: "MT", name: "책테마파크도서관" },
  { code: "MU", name: "운중도서관" },
  { code: "MV", name: "서현도서관" },
  { code: "MW", name: "복정도서관" },
  { code: "PK", name: "판교어린이도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

/**
 * Search for books in Seongnam City Libraries.
 * @param {Object} opt - Search options.
 * @param {string} opt.title - Book title to search for.
 * @param {string} opt.libraryName - Library name to search in.
 * @param {number} [opt.startPage] - Starting page number for pagination.
 * @param {function} [callback] - Optional callback(error, result).
 * @returns {Promise<Object>} Search result with totalBookCount and booklist.
 */
async function search(opt, callback) {
  const { title, libraryName } = opt;

  const validation = validateSearchOptions(opt, callback);
  if (!validation.valid) return;

  const lcode = getLibraryCode(libraryName);

  try {
    const { statusCode, body } = await get(
      "https://www.snlib.go.kr/intro/menu/10041/program/30009/plusSearchResultList.do",
      {
        qs: {
          currentPageNo: 1,
          searchBookClass: "ALL",
          searchCategory: "BOOK",
          searchKey: "ALL",
          searchKeyword: title,
          searchLibraryArr: lcode,
          searchOrder: "DESC",
          searchRecordCount: 1000,
          searchSort: "SIMILAR",
          searchType: "SIMPLE",
        },
      },
    );

    if (statusCode !== 200) {
      const error = { msg: `HTTP ${statusCode}` };
      if (callback) {
        callback(error);
        return;
      }
      throw new Error(error.msg);
    }

    const dom = new JSDOM(body);
    const $ = jquery(dom.window);
    const count = $("strong.themeFC").text().match(/\d+/)[0];
    const booklist = [];
    if (count) {
      $(".resultList > li").each((_, a) => {
        const titleElement = $(a).find(".tit a");
        const bookTitle = titleElement.text().trim();
        const onclick = titleElement.attr("onclick") || "";
        const match = onclick.match(
          /fnSearchResultDetail\((\d+),(\d+),'(\w+)'\)/,
        );
        let bookUrl = "";
        if (match) {
          const [, recKey, bookKey, publishFormCode] = match;
          bookUrl = `https://www.snlib.go.kr/intro/menu/10041/program/30009/plusSearchResultDetail.do?recKey=${recKey}&bookKey=${bookKey}&publishFormCode=${publishFormCode}`;
        }
        const availability = $(a).find(".bookStateBar .txt b").text();
        // Format: "소장처:도서관이름" - split by colon to extract library name
        const libraryNameParts = $(a)
          .find(".site > span:first-child")
          .text()
          .split(":");
        const libName =
          libraryNameParts && libraryNameParts[1]
            ? libraryNameParts[1].trim()
            : "";
        if (bookTitle) {
          booklist.push({
            libraryName: libName,
            title: bookTitle,
            bookUrl,
            maxoffset: count,
            exist: availability.includes("대출가능"),
          });
        }
      });
    }

    const result = {
      startPage: opt.startPage,
      totalBookCount: count,
      booklist,
    };

    if (callback) {
      callback(null, result);
      return;
    }
    return result;
  } catch (err) {
    const error = { msg: err.message || err.toString() };
    if (callback) {
      callback(error);
      return;
    }
    throw err;
  }
}

module.exports = {
  search,
  homeUrl,
  getLibraryNames: function () {
    return getLibraryNames(libraryList);
  },
};
