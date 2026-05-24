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

export const moduleName = "파주시도서관";
export const homeUrl = "https://lib.paju.go.kr";

const SEARCH_URL =
  "https://lib.paju.go.kr/jalib/plusSearchResultList.do";
const DETAIL_URL =
  "https://lib.paju.go.kr/jalib/menu/10056/program/30004/plusSearchResultDetail.do";

const libraryList: LibraryInfo[] = [
  { code: "MA", name: "중앙도서관" },
  { code: "MB", name: "금촌도서관" },
  { code: "MC", name: "문산도서관" },
  { code: "MD", name: "법원도서관" },
  { code: "ME", name: "적성도서관" },
  { code: "MQ", name: "교하도서관" },
  { code: "MI", name: "한빛도서관" },
  { code: "MH", name: "해솔도서관" },
  { code: "MN", name: "탄현도서관" },
  { code: "MM", name: "가람도서관" },
  { code: "MF", name: "조리도서관" },
  { code: "MK", name: "금촌3동솔빛도서관" },
  { code: "ML", name: "물푸레도서관" },
  { code: "MP", name: "파평도서관" },
  { code: "MR", name: "한울도서관" },
  { code: "MO", name: "월롱도서관" },
  { code: "MS", name: "광탄도서관" },
  { code: "MJ", name: "술이홀도서관" },
  { code: "SF", name: "금촌무지개작은도서관" },
  { code: "SD", name: "금곡작은도서관" },
  { code: "SA", name: "탄현작은도서관" },
  { code: "SB", name: "부엉이책장" },
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
      searchKey: "TITLE",
      searchKeyword: title,
      searchLibraryArr: lcode,
      searchRecordCount: 200,
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  const countEl = document.querySelector("p.rtitle b.themeFC");
  const count = extractNumber(countEl?.textContent);

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
      /fnSearchResultDetail\((\d+),(\d+),'(\w+)'\)/,
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
