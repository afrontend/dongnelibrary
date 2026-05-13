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

export const moduleName = "영등포구립도서관";
export const homeUrl = "https://ydplib.or.kr";

const SEARCH_URL = "https://ydplib.or.kr/intro/plusSearchResultList.do";
const DETAIL_URL =
  "https://ydplib.or.kr/intro/menu/10003/program/30001/plusSearchResultDetail.do";

const libraryList: LibraryInfo[] = [
  { code: "CE", name: "신길도서관" },
  { code: "CG", name: "여의도브라이튼도서관" },
  { code: "CA", name: "대림도서관" },
  { code: "CB", name: "문래도서관" },
  { code: "CC", name: "선유도서관" },
  { code: "MA", name: "여의샛강도서관" },
  { code: "LX", name: "영등포생각공장도서관" },
  { code: "LY", name: "원지공원도서관" },
  { code: "LW", name: "밤동산작은도서관" },
  { code: "CF", name: "조롱박작은도서관" },
  { code: "LF", name: "당산1동 작은도서관" },
  { code: "LG", name: "당산2동 작은도서관" },
  { code: "LR", name: "대림1동 작은도서관" },
  { code: "LS", name: "대림2동 작은도서관" },
  { code: "LU", name: "목화마을 작은도서관" },
  { code: "LL", name: "신길1동 작은도서관" },
  { code: "LC", name: "청소년문화의집 작은도서관" },
  { code: "LN", name: "신길4동 작은도서관" },
  { code: "LO", name: "신길5동 작은도서관" },
  { code: "LP", name: "신길6동 작은도서관" },
  { code: "LQ", name: "신길7동 작은도서관" },
  { code: "LJ", name: "양평1동 작은도서관" },
  { code: "LK", name: "양평2동 작은도서관" },
  { code: "LE", name: "여의동 작은도서관" },
  { code: "LD", name: "영등포동 작은도서관" },
  { code: "LB", name: "영등포본동 작은도서관" },
  { code: "LV", name: "늘샘드리 작은도서관" },
  { code: "CD", name: "영등포스마트도서관" },
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
      searchRecordCount: 50,
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  // Count is in p.rtitle > span.themeFC, e.g. "205건"
  const countEl = document.querySelector("p.rtitle span.themeFC");
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
