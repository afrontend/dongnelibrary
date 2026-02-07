import {
  getLibraryNames as getLibNames,
  createLibraryCodeLookup,
  validateSearchOptions,
  extractNumber,
  wrapWithCallback,
} from "../util";
import { get } from "../http";
import { JSDOM } from "jsdom";
import type { Book, LibraryInfo, SearchOptions, SearchResult } from "../types";

export const moduleName = "여주시립도서관";
export const homeUrl = "https://www.yjlib.go.kr";

const libraryList: LibraryInfo[] = [
  // Public libraries (시립도서관)
  { code: "MA", name: "여주도서관" },
  { code: "MB", name: "세종도서관" },
  { code: "ME", name: "점동도서관" },
  { code: "MH", name: "여주기적의도서관" },
  { code: "MI", name: "흥천도서관" },
  { code: "MG", name: "금사도서관" },
  { code: "MF", name: "대신도서관" },
  // Small libraries (작은도서관)
  { code: "MC", name: "산북작은도서관" },
  { code: "MD", name: "북내작은도서관" },
  // Smart libraries (스마트도서관)
  { code: "SA", name: "여주역스마트도서관" },
  { code: "SB", name: "이마트스마트도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

/**
 * Search for books in Yeoju City Libraries.
 */
async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { statusCode, body } = await get(
    "https://www.yjlib.go.kr/web/menu/10036/program/30001/searchResultList.do",
    {
      qs: {
        searchType: "SIMPLE",
        searchCategory: "ALL",
        searchLibraryArr: lcode,
        searchField: "ALL",
        searchWord: title,
        searchRecordCount: 1000,
      },
      signal,
    },
  );

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  // Extract total count from "총 <strong class="highlight">15</strong> 건"
  const resultText =
    document.querySelector(".result_box .result_screen")?.textContent ?? "";
  const countMatch = resultText.match(/총\s*(\d+)\s*건/);
  const count = countMatch ? countMatch[1] : "0";

  const booklist: Book[] = [];
  const bookItems = document.querySelectorAll(".bookList .bookArea");

  bookItems.forEach((item) => {
    // Get title from .book_name span (remove highlight spans)
    const titleElement = item.querySelector(".book_name a span");
    let bookTitle = "";
    if (titleElement) {
      // Clone and get text content (this preserves the text without highlight spans)
      bookTitle = titleElement.textContent?.trim() ?? "";
    }

    // Extract book URL from onclick handler
    // fnSearchResultDetail(speciesKey, bookKey, publishFormCode) submits a form via POST,
    // but the same endpoint accepts GET requests with speciesKey parameter
    let bookUrl = "";
    const titleLink = item.querySelector(".book_name a");
    const onclick = titleLink?.getAttribute("onclick") ?? "";
    const urlMatch = onclick.match(
      /fnSearchResultDetail\(['"]?(\d+)['"]?,\s*['"]?(\d+)['"]?,\s*['"]?(\w+)['"]?\)/,
    );
    if (urlMatch) {
      const [, speciesKey, bookKey, publishFormCode] = urlMatch;
      bookUrl = `https://www.yjlib.go.kr/web/menu/10036/program/30001/searchResultDetail.do?speciesKey=${speciesKey}&bookKey=${bookKey}&publishFormCode=${publishFormCode}`;
    }

    // Get library name from .book_info.info03 first strong element
    let libName = "";
    const info03 = item.querySelector(".book_info.info03");
    if (info03) {
      const firstStrong = info03.querySelector("p strong");
      if (firstStrong) {
        libName = firstStrong.textContent?.trim() ?? "";
      }
    }

    // Get availability status from .bookBtnWrap
    const statusEl = item.querySelector(".bookBtnWrap");
    const statusText = statusEl?.textContent ?? "";
    const exist = statusText.includes("대출가능");

    if (bookTitle) {
      booklist.push({
        libraryName: libName,
        title: bookTitle,
        bookUrl,
        maxoffset: count,
        exist,
      });
    }
  });

  return {
    startPage: opt.startPage,
    totalBookCount: extractNumber(count),
    booklist,
  };
}

export const search = wrapWithCallback(searchImpl);

export function getLibraryNames(): string[] {
  return getLibNames(libraryList);
}
