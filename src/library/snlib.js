const getLibraryNames = require("../util.js").getLibraryNames;
const jquery = require("jquery");
const { get } = require("../http");
const { JSDOM } = require("jsdom");

const libraryList = [
  { code: "BF", name: "논골도서관" },
  { code: "CK", name: "중원어린이도서관" },
  { code: "MA", name: "성남중앙도서관" },
  { code: "MB", name: "분당도서관" },
  { code: "MG", name: "구미도서관" },
  { code: "MH", name: "해오름도서관" },
  { code: "MJ", name: "중원도서관" },
  { code: "MM", name: "무지개도서관" },
  { code: "MP", name: "판교도서관" },
  { code: "MR", name: "위례도서관" },
  { code: "MS", name: "수정도서관" },
  { code: "MT", name: "책테마파크도서관" },
  { code: "MU", name: "운중도서관" },
  { code: "MV", name: "서현도서관" },
  { code: "MW", name: "복정도서관" },
  { code: "PK", name: "판교어린이도서관" },
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
      if (getBook) {
        getBook({ msg: `HTTP ${statusCode}` });
      }
      return;
    }

    const dom = new JSDOM(body);
    const $ = jquery(dom.window);
    const count = $("strong.themeFC").text().match(/\d+/)[0];
    const booklist = [];
    if (count) {
      $(".resultList > li").each((_, a) => {
        const titleElement = $(a).find(".tit a");
        const title = titleElement.text().trim();
        const onclick = titleElement.attr("onclick") || "";
        const match = onclick.match(
          /fnSearchResultDetail\((\d+),(\d+),'(\w+)'\)/,
        );
        let bookUrl = "";
        if (match) {
          const [, recKey, bookKey, publishFormCode] = match;
          bookUrl = `https://www.snlib.go.kr/intro/menu/10041/program/30009/plusSearchResultDetail.do?recKey=${recKey}&bookKey=${bookKey}&publishFormCode=${publishFormCode}`;
        }
        const rented = $(a).find(".bookStateBar .txt b").text();
        const b = $(a).find(".site > span:first-child").text().split(":");
        const libraryName = b && b[1] ? b[1].trim() : "";
        if (title) {
          booklist.push({
            libraryName,
            title,
            bookUrl,
            maxoffset: count,
            exist: rented.includes("대출가능"),
          });
        }
      });
    }
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
  getLibraryNames: function () {
    return getLibraryNames(libraryList);
  },
};
