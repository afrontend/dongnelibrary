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

export const moduleName = "하남시도서관";
export const homeUrl = "https://www.hanamlib.go.kr";

const SEARCH_URL =
  "https://www.hanamlib.go.kr/kolaseek/search/plusSearchResultList.do";
const DETAIL_URL =
  "https://www.hanamlib.go.kr/kolaseek/search/plusSearchDetailView.do";

const libraryList: LibraryInfo[] = [
  { code: "MA", name: "신장도서관" },
  { code: "MB", name: "나룰도서관" },
  { code: "MC", name: "덕풍도서관" },
  { code: "MD", name: "세미도서관" },
  { code: "ME", name: "디지털도서관" },
  { code: "MF", name: "위례도서관" },
  { code: "MG", name: "어울림작은도서관" },
  { code: "MH", name: "덕풍스포츠작은도서관" },
  { code: "MI", name: "감일도서관" },
  { code: "MS", name: "미사도서관" },
  { code: "IG", name: "일가도서관" },
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
      searchKey: "TITLE",
      searchKeyword: title,
      searchLibraryArr: lcode,
      searchRecordCount: 50,
      searchPageNo: 1,
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  const htitleEl = document.querySelector("p.htitle.stitle");
  const count = extractNumber(
    htitleEl?.textContent?.match(/총\s*([\d,]+)건/)?.[0],
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
    const urlMatch = onclick.match(/fnSearchDetailView\((\d+),(\d+),'(\w+)'\)/);
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
