const {
  getLibraryNames,
  createLibraryCodeLookup,
  validateSearchOptions,
  extractNumber,
} = require("../util.js");
const { post } = require("../http");
const { JSDOM } = require("jsdom");

const homeUrl = "https://hscitylib.or.kr";

const libraryList = [
  { code: "MA", name: "남양도서관" },
  { code: "MB", name: "태안도서관" },
  { code: "MC", name: "삼괴도서관" },
  { code: "MD", name: "병점도서관" },
  { code: "ME", name: "샘내도서관" },
  { code: "MF", name: "두빛나래어린이도서관" },
  { code: "MG", name: "봉담도서관" },
  { code: "MH", name: "둥지나래어린이도서관" },
  { code: "MI", name: "목동이음터도서관" },
  { code: "MJ", name: "기아행복마루도서관" },
  { code: "MK", name: "화성동탄중앙도서관" },
  { code: "ML", name: "송산도서관" },
  { code: "MM", name: "정남도서관" },
  { code: "MN", name: "비봉도서관" },
  { code: "MO", name: "진안도서관" },
  { code: "MP", name: "중앙이음터도서관" },
  { code: "MQ", name: "양감도서관" },
  { code: "MR", name: "다원이음터도서관" },
  { code: "MS", name: "송린이음터도서관" },
  { code: "MT", name: "팔탄도서관" },
  { code: "MU", name: "마도도서관" },
  { code: "MV", name: "봉담커피앤북도서관" },
  { code: "MW", name: "왕배푸른숲도서관" },
  { code: "MX", name: "노을빛도서관" },
  { code: "MY", name: "서연이음터도서관" },
  { code: "MZ", name: "호연이음터도서관" },
  { code: "NA", name: "향남복합문화센터도서관" },
  { code: "NB", name: "봉담와우도서관" },
  { code: "TA", name: "늘봄이음터도서관" },
  { code: "TB", name: "달빛나래어린이도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

/**
 * Search for books in Hwaseong City Libraries.
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
  const url = `https://hscitylib.or.kr/intro/menu/10008/program/30001/searchResultList.do`;

  try {
    const { statusCode, body } = await post(url, {
      form: {
        searchType: "SIMPLE",
        searchKeyword: title,
        searchManageCodeArr: lcode,
        searchDisplay: 1000,
      },
    });

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

    const countText = document.querySelector("#totalCnt")?.textContent ?? "";
    const count = extractNumber(countText);

    const booklist = [];
    const bookItems = document.querySelectorAll(".bookArea");
    bookItems.forEach((item) => {
      const titleElement = item.querySelector("p.book_name.kor.on > a");
      const bookTitle = titleElement?.getAttribute("title") ?? "";
      const onclick = titleElement?.getAttribute("onclick") ?? "";
      const match = onclick.match(
        /fnDetail\('(\d+)',\s*'(\d+)',\s*'([^']*)',\s*'(\w+)'\)/,
      );
      let bookUrl = "";
      if (match) {
        const [, bookKey, speciesKey, isbn, pubFormCode] = match;
        bookUrl = `https://hscitylib.or.kr/intro/menu/10008/program/30001/searchResultDetail.do?bookKey=${bookKey}&speciesKey=${speciesKey}&isbn=${isbn}&pubFormCode=${pubFormCode}`;
      }
      const availability = item.querySelector("span.emp8")?.textContent?.trim() ?? "";
      const libName = item.querySelector("b.themeFC")?.textContent?.trim() ?? "";
      booklist.push({
        libraryName: libName.replace(/[\[\]]/g, ""),
        title: bookTitle,
        bookUrl,
        maxoffset: count,
        exist: availability.includes("대출가능"),
      });
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
