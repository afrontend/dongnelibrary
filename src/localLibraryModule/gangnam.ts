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

export const moduleName = "강남구통합도서관";
export const homeUrl = "https://library.gangnam.go.kr";

const SEARCH_URL =
  "https://library.gangnam.go.kr/intro/plusSearchResultList.do";
const DETAIL_URL =
  "https://library.gangnam.go.kr/intro/menu/10003/program/30001/plusSearchResultDetail.do";

const libraryList: LibraryInfo[] = [
  { code: "MA", name: "도곡정보문화도서관" },
  { code: "MM", name: "개포하늘꿈도서관" },
  { code: "MB", name: "논현도서관" },
  { code: "MN", name: "논현문화마루도서관" },
  { code: "SA", name: "논현문화마루도서관 별관" },
  { code: "SB", name: "대치1작은도서관" },
  { code: "MC", name: "대치도서관" },
  { code: "MD", name: "못골도서관" },
  { code: "ME", name: "못골한옥어린이도서관" },
  { code: "SC", name: "삼성도서관" },
  { code: "SD", name: "세곡도서관" },
  { code: "SF", name: "세곡마루도서관" },
  { code: "SE", name: "역삼2동작은도서관" },
  { code: "MF", name: "역삼도서관" },
  { code: "MG", name: "역삼푸른솔도서관" },
  { code: "MH", name: "열린도서관" },
  { code: "SH", name: "일원라온영어도서관" },
  { code: "MI", name: "정다운도서관" },
  { code: "MJ", name: "즐거운도서관" },
  { code: "MK", name: "청담도서관" },
  { code: "ML", name: "행복한도서관" },
  { code: "TD", name: "개포4동주민도서관" },
  { code: "TC", name: "도곡2동주민도서관" },
  { code: "TA", name: "신사동주민도서관" },
  { code: "TB", name: "압구정동주민도서관" },
  { code: "TE", name: "일원본동주민도서관" },
  { code: "TI", name: "개포1동주민도서관" },
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
      searchRecordCount: 1000,
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
