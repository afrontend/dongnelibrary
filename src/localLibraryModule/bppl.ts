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

export const moduleName = "부평구립도서관";
export const homeUrl = "https://www.bppl.or.kr";

const SEARCH_URL = `${homeUrl}/bplib/searchResultList.do`;
const DETAIL_URL = `${homeUrl}/bugae/menu/10095/program/30031/searchResultDetail.do`;

const libraryList: LibraryInfo[] = [
  { code: "ME", name: "부개도서관" },
  { code: "MD", name: "삼산도서관" },
  { code: "MA", name: "부평기적의도서관" },
  { code: "MF", name: "청천도서관" },
  { code: "MC", name: "갈산도서관" },
  { code: "MB", name: "부개어린이도서관" },
  { code: "JH", name: "갈산밀알도서관" },
  { code: "JD", name: "글마루 작은도서관" },
  { code: "JC", name: "동수작은도서관" },
  { code: "JG", name: "희망천작은도서관" },
  { code: "JJ", name: "꿈땅도서관" },
  { code: "JP", name: "늘푸른도서관" },
  { code: "JF", name: "꿈나무작은도서관" },
  { code: "JE", name: "산곡글향기작은도서관" },
  { code: "JI", name: "청개구리어린이도서관" },
  { code: "JK", name: "해오름 작은도서관" },
  { code: "JA", name: "신나는여성주의도서관 랄라" },
  { code: "JM", name: "샘터작은도서관" },
  { code: "JB", name: "청소년인문학도서관 DOING" },
  { code: "JN", name: "춤추는달팽이도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { statusCode, body } = await get(SEARCH_URL, {
    qs: {
      searchType: "SIMPLE",
      searchCategory: "BOOK",
      searchField: "TITLE",
      searchLibrary: "",
      searchLibraryArr: lcode,
      searchWord: title,
      searchRecordCount: 20,
      currentPageNo: opt.startPage ?? 1,
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  const resultText = document.querySelector("p.rtitle")?.textContent ?? "";
  const count = extractNumber(
    resultText.match(/([\d,]+)\s*건이\s*검색되었습니다/)?.[1],
  );

  const booklist: Book[] = [];
  document.querySelectorAll("ul.resultList > li").forEach((li) => {
    const titleLink = li.querySelector("dl.bookDataWrap dt.tit a");
    const bookTitle = (titleLink?.textContent?.trim() ?? "").replace(
      /^\d+\.\s*/,
      "",
    );

    let bookUrl = "";
    const onclick = titleLink?.getAttribute("onclick") ?? "";
    const urlMatch = onclick.match(
      /fnSearchResultDetail\((\d+),(\d+),'(\w+)'\)/,
    );
    if (urlMatch) {
      const [, speciesKey, bookKey, publishFormCode] = urlMatch;
      bookUrl = `${DETAIL_URL}?speciesKey=${speciesKey}&bookKey=${bookKey}&publishFormCode=${publishFormCode}`;
    }

    const stateEl = li.querySelector("div.bookStateBar p.txt b");
    const exist = stateEl?.textContent?.includes("대출가능") ?? false;

    const siteText =
      li.querySelector("dd.site span")?.textContent?.trim() ?? "";
    const libName = siteText.replace(/^도서관:\s*/, "");

    if (bookTitle) {
      booklist.push({ libraryName: libName, title: bookTitle, bookUrl, exist });
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
