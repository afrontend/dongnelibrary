const {
  getLibraryNames,
  createLibraryCodeLookup,
  validateSearchOptions,
} = require("../util.js");
const { get } = require("../http");
const { JSDOM } = require("jsdom");

const homeUrl = "https://lib.goe.go.kr";

const libraryList = [
  { code: "MA", name: "경기중앙교육도서관" },
  { code: "MB", name: "경기평택교육도서관" },
  { code: "MC", name: "경기광주교육도서관" },
  { code: "MD", name: "경기여주가남교육도서관" },
  { code: "ME", name: "경기포천교육도서관" },
  { code: "MF", name: "경기김포교육도서관" },
  { code: "MG", name: "경기과천교육도서관" },
  { code: "MH", name: "경기성남교육도서관" },
  { code: "MJ", name: "경기화성교육도서관" },
  { code: "MK", name: "경기의정부교육도서관" },
  { code: "ML", name: "경기평생교육학습관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

/**
 * Search for books in Gyeonggi Provincial Educational Libraries.
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
      `https://lib.goe.go.kr/gg/intro/search/index.do`,
      {
        qs: {
          booktype: "BOOKANDNONBOOK",
          libraryCodes: lcode,
          rowCount: 1000,
          search_text: title,
          viewPage: 1,
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
    const document = dom.window.document;

    const counterEl = document.querySelector(
      "#search_result > div.research-box > div.search-info > b",
    );
    const count = counterEl ? Number(counterEl.innerHTML) : 0;

    const booklist = [];
    const bookItems = document.querySelectorAll(".bif");
    bookItems.forEach((item) => {
      const titleElement = item.querySelector(".book-title");
      const bookTitle = titleElement?.querySelector("span")?.textContent?.trim() ?? "";
      const bookPath = titleElement?.getAttribute("href") ?? "";
      const bookUrl = bookPath
        ? "https://lib.goe.go.kr/gg/intro/search/" + bookPath
        : "";
      const availability = item.querySelector(".state.typeC")?.textContent?.trim() ?? "";

      // Find span containing "도서관" and get its next sibling's text
      let libName = "";
      const spans = item.querySelectorAll("span");
      for (const span of spans) {
        if (span.textContent?.includes("도서관")) {
          const nextSibling = span.nextElementSibling;
          if (nextSibling) {
            libName = nextSibling.textContent?.split("|")[0]?.trim() ?? "";
          }
          break;
        }
      }

      if (bookTitle) {
        booklist.push({
          libraryName: libName,
          title: bookTitle,
          bookUrl,
          maxoffset: count,
          exist: availability === "대출가능",
        });
      }
    });

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
