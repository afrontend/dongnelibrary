const getLibraryNames = require("../util.js").getLibraryNames;
const jquery = require("jquery");
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

function getLibraryCode(libraryName) {
  const found = libraryList.find((lib) => lib.name === libraryName);
  return found ? found.code : "";
}

async function search(opt, getBook) {
  let title = opt.title;
  let libraryName = opt.libraryName;

  if (!title) {
    if (getBook) {
      getBook({ msg: "Need a book name" });
    }
    return;
  }

  if (!libraryName) {
    if (getBook) {
      getBook({ msg: "Need a library name" });
    }
    return;
  }

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
      if (getBook) {
        getBook({ msg: `HTTP ${statusCode}` });
      }
      return;
    }

    const dom = new JSDOM(body);
    const $counter = dom.window.document.querySelector(
      "#search_result > div.research-box > div.search-info > b",
    );
    const count = $counter ? Number($counter.innerHTML) : 0;
    const $ = jquery(dom.window);
    const booklist = [];
    $(".bif").each((_, a) => {
      const titleElement = $(a).find(".book-title");
      const title = titleElement.find("> span").text().trim();
      const bookPath = titleElement.attr("href");
      const bookUrl = bookPath
        ? "https://lib.goe.go.kr/gg/intro/search/" + bookPath
        : "";
      const rented = $(a).find(".state.typeC").text().trim();
      const libraryName = $(a)
        .find("span:contains('도서관')")
        .next()
        .text()
        .split("|")[0]
        .trim();
      if (title) {
        booklist.push({
          libraryName,
          title,
          bookUrl,
          maxoffset: count,
          exist: rented === "대출가능",
        });
      }
    });
    getBook(null, {
      startPage: opt.startPage,
      totalBookCount: count,
      booklist,
    });
  } catch (err) {
    if (getBook) {
      getBook({ msg: err.toString() });
    }
  }
}

module.exports = {
  search,
  homeUrl,
  getLibraryNames: function () {
    return getLibraryNames(libraryList);
  },
};
