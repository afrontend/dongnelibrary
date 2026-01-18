const getLibraryNames = require("../util.js").getLibraryNames;
const { get } = require("../http");
const { JSDOM } = require("jsdom");

const homeUrl = "https://www.osanlibrary.go.kr";

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
      `https://www.osanlibrary.go.kr/intro/program/plusSearchResultList.do`,
      {
        qs: {
          searchType: "SIMPLE",
          searchCategory: "ALL",
          searchLibraryArr: lcode,
          searchKey: "ALL",
          searchKeyword: title,
          searchRecordCount: 1000,
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
      // Get title and book URL from .book_name link
      const titleLink = li.querySelector(".book_name");
      const titleEl = titleLink ? titleLink.querySelector("span") : null;
      const bookTitle = titleEl ? titleEl.textContent.trim() : "";

      // Extract book URL from onclick handler
      let bookUrl = "";
      const onclick = titleLink ? titleLink.getAttribute("onclick") || "" : "";
      const urlMatch = onclick.match(
        /fnSearchResultDetail\((\d+),(\d+),'(\w+)'\)/,
      );
      if (urlMatch) {
        const [, recKey, bookKey, publishFormCode] = urlMatch;
        bookUrl = `https://www.osanlibrary.go.kr/intro/menu/10003/program/30004/plusSearchResultDetail.do?recKey=${recKey}&bookKey=${bookKey}&publishFormCode=${publishFormCode}`;
      }

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
          bookUrl,
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
