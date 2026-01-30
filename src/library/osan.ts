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

export const moduleName = "오산시도서관";
export const homeUrl = "https://www.osanlibrary.go.kr";

const libraryList: LibraryInfo[] = [
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

const getLibraryCode = createLibraryCodeLookup(libraryList);

/**
 * Search for books in Osan City Libraries.
 */
async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

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
      signal,
    },
  );

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  // Extract total count from "총 <span class="highlight">44</span>건"
  const highlightSpan = document.querySelector("span.highlight");
  const count = extractNumber(highlightSpan?.textContent);

  const booklist: Book[] = [];
  const bookItems = document.querySelectorAll(".bookList .listWrap > li");
  bookItems.forEach((li) => {
    // Get title and book URL from .book_name link
    const titleLink = li.querySelector(".book_name");
    const titleEl = titleLink ? titleLink.querySelector("span") : null;
    const bookTitle = titleEl ? titleEl.textContent?.trim() ?? "" : "";

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
    const statusText = statusEl ? statusEl.textContent?.trim() ?? "" : "";
    const exist = statusText.includes("대출가능");

    // Get library name from ".book_info .fb p" containing "소장도서관"
    let libName = "";
    const fbParagraphs = li.querySelectorAll(".book_info .fb p");
    fbParagraphs.forEach((p) => {
      const text = p.textContent;
      if (text?.includes("소장도서관")) {
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

  return {
    startPage: opt.startPage,
    totalBookCount: count,
    booklist,
  };
}

export const search = wrapWithCallback(searchImpl);

export function getLibraryNames(): string[] {
  return getLibNames(libraryList);
}
