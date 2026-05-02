import {
  getLibraryNames as getLibNames,
  createLibraryCodeLookup,
  validateSearchOptions,
  extractNumber,
  wrapWithCallback,
} from "../util";
import { get } from "../http";
import { JSDOM } from "jsdom";
import type {
  Book,
  LibraryInfo,
  LibraryModule,
  SearchOptions,
  SearchResult,
} from "../types";

export const moduleName = "평택시도서관";
export const homeUrl = "https://www.ptlib.go.kr";

const libraryList: LibraryInfo[] = [
  { code: "MJ", name: "배다리도서관" },
  { code: "MA", name: "비전도서관" },
  { code: "MB", name: "팽성도서관" },
  { code: "MC", name: "안중도서관" },
  { code: "MD", name: "지산초록도서관" },
  { code: "ME", name: "오성도서관" },
  { code: "MF", name: "장당도서관" },
  { code: "MG", name: "진위도서관" },
  { code: "MH", name: "세교도서관" },
  { code: "MK", name: "한국근현대음악도서관" },
  { code: "BA", name: "매봉작은도서관" },
  { code: "BB", name: "송탄작은도서관" },
  { code: "BC", name: "서정작은도서관" },
  { code: "BD", name: "포승작은도서관" },
  { code: "BE", name: "청북도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { statusCode, body } = await get(
    `${homeUrl}/intro/plusSearchResultList.do`,
    {
      qs: {
        searchType: "SIMPLE",
        searchCategory: "ALL",
        searchLibraryArr: lcode,
        searchKey: "ALL",
        searchKeyword: title,
        searchRecordCount: 150,
      },
      signal,
    },
  );

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  // Extract total count from "전체(40)" in the category list current item
  const currentLink = document.querySelector(".categoryList li a.current");
  const countMatch = currentLink?.textContent?.match(/전체\((\d+)\)/);
  const count = countMatch ? extractNumber(countMatch[1]) : 0;

  const booklist: Book[] = [];
  const bookItems = document.querySelectorAll("ul.resultList > li");
  bookItems.forEach((li) => {
    const titleLink = li.querySelector("dt.tit a");
    // Remove leading index number "1. " from title
    const rawTitle = titleLink?.textContent?.trim() ?? "";
    const bookTitle = rawTitle.replace(/^\d+\.\s*/, "");

    // Extract recKey, bookKey, publishFormCode from onclick
    let bookUrl = "";
    const onclick = titleLink?.getAttribute("onclick") ?? "";
    const urlMatch = onclick.match(
      /fnSearchResultDetail\((\d+),(\d+),'(\w+)'\)/,
    );
    if (urlMatch) {
      const [, recKey, bookKey, publishFormCode] = urlMatch;
      bookUrl = `${homeUrl}/intro/menu/11089/program/30015/plusSearchResultDetail.do?recKey=${recKey}&bookKey=${bookKey}&publishFormCode=${publishFormCode}`;
    }

    // Loan status from bookStateBar
    const stateText =
      li.querySelector(".bookStateBar p.txt")?.textContent ?? "";
    const exist = stateText.includes("대출가능");

    // Library name from "도서관: 평택시립 안중도서관"
    let libName = "";
    const siteSpans = li.querySelectorAll("dd.site span");
    siteSpans.forEach((span) => {
      const text = span.textContent ?? "";
      if (text.startsWith("도서관:")) {
        libName = text.replace("도서관:", "").trim();
      }
    });

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
    totalBookCount: count,
    booklist,
  };
}

export const search = wrapWithCallback(searchImpl);

export function getLibraryNames(): string[] {
  return getLibNames(libraryList);
}

({ moduleName, homeUrl, search, getLibraryNames }) satisfies LibraryModule;
