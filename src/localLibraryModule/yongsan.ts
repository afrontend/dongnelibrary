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

export const moduleName = "용산구립도서관";
export const homeUrl = "https://yslibrary.or.kr";

const SEARCH_URL =
  "https://www.yslibrary.or.kr/dream/menu/10102/program/30037/searchResultList.do";
const DETAIL_URL =
  "https://www.yslibrary.or.kr/dream/menu/10102/program/30037/searchDetailView.do";

const libraryList: LibraryInfo[] = [
  { code: "MA", name: "꿈나무도서관" },
  { code: "MB", name: "청파도서관" },
  { code: "OA", name: "용마루어린이도서관" },
  { code: "SA", name: "청파 어린이 영어도서관" },
  { code: "YB", name: "용암 어린이 영어도서관" },
  { code: "YC", name: "후암동 작은도서관 북앤캠프" },
  { code: "YD", name: "해다올 작은도서관(용산2가동)" },
  { code: "YF", name: "원효로제2동 작은도서관 두드림" },
  { code: "YG", name: "효창동 작은도서관" },
  { code: "YI", name: "한강로동 작은도서관" },
  { code: "YJ", name: "이촌2동 작은도서관" },
  { code: "YK", name: "회나무 작은도서관(이태원2동)" },
  { code: "YM", name: "서빙고동 작은도서관" },
  { code: "YN", name: "작은도서관 꿈꾸는책마을(보광동)" },
  { code: "YS", name: "별밭 작은도서관(한남동)" },
  { code: "YO", name: "청소년푸르미르 작은도서관(이촌1동)" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, startPage = 1, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { statusCode, body } = await get(SEARCH_URL, {
    qs: {
      searchType: "SIMPLE",
      searchCategory: "BOOK",
      searchKey: "TITLE",
      searchKeyword: title,
      searchLibraryArr: lcode,
      currentPageNo: String(startPage),
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  // themeFC 클래스는 검색어 하이라이트에도 쓰이므로 p.rtitle 안으로 한정
  const countEl = document.querySelector("p.rtitle span.themeFC");
  const count = extractNumber(
    countEl?.textContent?.match(/총\s*([\d,]+)\s*건/)?.[1],
  );

  const booklist: Book[] = [];
  const bookItems = document.querySelectorAll("ul.resultList > li");
  bookItems.forEach((li) => {
    const titleLink = li.querySelector("dl.bookDataWrap dt.tit a");
    const bookTitle = (titleLink?.textContent?.trim() ?? "").replace(
      /^\d+\.\s*/,
      "",
    );

    let bookUrl = "";
    const onclick = titleLink?.getAttribute("onclick") ?? "";
    const urlMatch = onclick.match(
      /fnSearchDetailView\((\d+),(\d+),'(\w+)'\)/,
    );
    if (urlMatch) {
      const [, recKey, bookKey, publishFormCode] = urlMatch;
      bookUrl = `${DETAIL_URL}?recKey=${recKey}&bookKey=${bookKey}&publishFormCode=${publishFormCode}`;
    }

    const stateEl = li.querySelector("div.bookStateBar p.txt b");
    const exist = stateEl?.textContent?.includes("대출가능") ?? false;

    let libName = "";
    const siteSpan = li.querySelector("dd.site span");
    const siteText = siteSpan?.textContent?.trim() ?? "";
    if (siteText.startsWith("도서관:")) {
      libName = siteText.replace("도서관:", "").trim();
    }

    if (bookTitle) {
      booklist.push({ libraryName: libName, title: bookTitle, bookUrl, exist });
    }
  });

  return {
    startPage,
    totalBookCount: count,
    booklist,
  };
}

export const search = wrapWithCallback(searchImpl);

export function getLibraryNames(): string[] {
  return getLibNames(libraryList);
}

({ moduleName, homeUrl, search, getLibraryNames }) satisfies LibraryModule;
