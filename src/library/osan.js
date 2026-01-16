const getLibraryNames = require("../util.js").getLibraryNames;
const req = require("request");
const { JSDOM } = require("jsdom");

const libraryList = [
  { code: "MA", name: "오산중앙도서관" },
  { code: "MG", name: "꿈두레도서관" },
  { code: "ME", name: "초평도서관" },
  { code: "MC", name: "햇살마루도서관" },
  { code: "MB", name: "청학도서관" },
  { code: "MD", name: "양산도서관" },
  { code: "MI", name: "소리울도서관" },
  { code: "MY", name: "무지개도서관" },
  { code: "MH", name: "고현초꿈키움도서관" },
  { code: "MJ", name: "쌍용예가시민개방도서관" },
];

function getLibraryCode(libraryName) {
  const found = libraryList.find((lib) => lib.name === libraryName);
  return found ? found.code : "";
}

function search(opt, getBook) {
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

  // https://www.osanlibrary.go.kr/intro/program/plusSearchResultList.do?searchType=SIMPLE&searchCategory=ALL&searchLibraryArr=MA&searchKey=ALL&searchKeyword=javascript&searchRecordCount=20
  const lcode = getLibraryCode(libraryName);
  req.get(
    {
      url: `https://www.osanlibrary.go.kr/intro/program/plusSearchResultList.do`,
      timeout: 20000,
      qs: {
        searchType: "SIMPLE",
        searchCategory: "ALL",
        searchLibraryArr: lcode,
        searchKey: "ALL",
        searchKeyword: title,
        searchRecordCount: 1000,
      },
    },
    function (err, res, body) {
      if (err || (res && res.statusCode !== 200)) {
        let msg = "";

        if (err) {
          msg = err;
        }

        if (res && res.statusCode) {
          msg = msg + " " + res.statusCode;
        }

        if (getBook) {
          getBook({ msg: msg });
        }
      } else {
        const dom = new JSDOM(body);
        const document = dom.window.document;

        // Extract total count from "총 <span class="highlight">44</span>건"
        const highlightSpans = document.querySelectorAll("span.highlight");
        let count = "0";
        for (const span of highlightSpans) {
          const text = span.textContent.trim();
          if (/^\d+$/.test(text)) {
            count = text;
            break;
          }
        }

        const booklist = [];
        const bookItems = document.querySelectorAll(".bookList .listWrap > li");
        bookItems.forEach((li) => {
          // Get title from .book_name span
          const titleEl = li.querySelector(".book_name span");
          const bookTitle = titleEl ? titleEl.textContent.trim() : "";

          // Get availability status from .status p
          const statusEl = li.querySelector(".status p");
          const statusText = statusEl ? statusEl.textContent.trim() : "";
          const exist = statusText.includes("대출가능");

          // Get library name from ".book_info .fb p" containing "소장도서관"
          let libName = "";
          const fbParagraphs = li.querySelectorAll(".book_info .fb p");
          fbParagraphs.forEach((p) => {
            const text = p.textContent;
            if (text.includes("소장도서관")) {
              // Format: "[공공]오산시중앙도서관" - extract library name after "]"
              const match = text.match(/\](.+)$/);
              if (match) {
                libName = match[1].trim();
              }
            }
          });

          if (bookTitle) {
            booklist.push({
              libraryName: libName,
              title: bookTitle,
              maxoffset: count,
              exist: exist,
            });
          }
        });

        getBook(null, {
          startPage: opt.startPage,
          totalBookCount: count,
          booklist,
        });
      }
    },
  );
}

module.exports = {
  search,
  getLibraryNames: function () {
    return getLibraryNames(libraryList);
  },
};
