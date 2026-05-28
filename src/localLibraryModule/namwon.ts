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

export const moduleName = "남원시도서관";
export const homeUrl = "https://www.namwon.go.kr/lib";

const SEARCH_URL =
  "https://www.namwon.go.kr/lib/web/menu/10017/program/30003/searchResultList.do";
const DETAIL_URL =
  "https://www.namwon.go.kr/lib/web/menu/10017/program/30003/searchResultDetail.do";

const libraryList: LibraryInfo[] = [
  { code: "MU", name: "남원어울림도서관" },
  { code: "MA", name: "남원시립도서관" },
  { code: "MN", name: "어린이청소년도서관" },
  { code: "MB", name: "새싹작은도서관" },
  { code: "MC", name: "황죽작은도서관" },
  { code: "MD", name: "혼불작은도서관" },
  { code: "ME", name: "독우물작은도서관" },
  { code: "MF", name: "송동작은도서관" },
  { code: "MG", name: "금동작은도서관" },
  { code: "MH", name: "이그린작은도서관" },
  { code: "MI", name: "휴먼시아작은도서관" },
  { code: "MJ", name: "빨간사과작은도서관" },
  { code: "MK", name: "메카센트럴작은도서관" },
  { code: "ML", name: "오들작은도서관" },
  { code: "SA", name: "품안작은도서관" },
  { code: "MO", name: "아영작은도서관" },
  { code: "MP", name: "향교동작은도서관" },
  { code: "MQ", name: "산동면작은도서관" },
  { code: "MR", name: "이백면작은도서관" },
  { code: "MT", name: "보절면작은도서관" },
  { code: "MS", name: "주천면작은도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { statusCode, body } = await get(SEARCH_URL, {
    qs: {
      searchType: "SIMPLE",
      searchCategory: "ALL",
      searchMenuCategory: "ALL",
      searchField: "ALL",
      searchWord: title,
      searchLibrary: "ALL",
      searchLibraryArr: lcode,
      searchRecordCount: 50,
      currentPageNo: opt.startPage ?? 1,
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  const resultScreen = document.querySelector("div.result_screen");
  const totalText = resultScreen?.textContent ?? "";
  const totalMatch = totalText.match(/총\s*([\d,]+)\s*건/);
  const totalBookCount = totalMatch ? extractNumber(totalMatch[1]) : 0;

  const booklist: Book[] = [];
  const items = document.querySelectorAll("ul.listWrap > li");

  items.forEach((li) => {
    const titleLink = li.querySelector("div.book_name a");
    const span = titleLink?.querySelector("span");
    const bookTitle = span?.textContent?.trim() ?? "";
    if (!bookTitle) return;

    const onclick = titleLink?.getAttribute("onclick") ?? "";
    const urlMatch = onclick.match(
      /fnSearchResultDetail\(['"]?(\d+)['"]?,\s*['"]?(\d+)['"]?,\s*['"](\w+)['"]\)/,
    );
    const bookUrl = urlMatch
      ? `${DETAIL_URL}?speciesKey=${urlMatch[1]}&bookKey=${urlMatch[2]}&publishFormCode=${urlMatch[3]}`
      : "";

    const libStrong = li.querySelector("div.book_info.info03 p strong");
    const libName = libStrong?.textContent?.trim() ?? "";

    const statusEl = li.querySelector("div.status p");
    const exist = statusEl?.textContent?.includes("대출가능") ?? false;

    booklist.push({ libraryName: libName, title: bookTitle, bookUrl, exist });
  });

  return {
    startPage: opt.startPage,
    totalBookCount,
    booklist,
  };
}

export const search = wrapWithCallback(searchImpl);

export function getLibraryNames(): string[] {
  return getLibNames(libraryList);
}

({ moduleName, homeUrl, search, getLibraryNames }) satisfies LibraryModule;
