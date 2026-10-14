import {
  getLibraryNames as getLibNames,
  createLibraryCodeLookup,
  validateSearchOptions,
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

export const moduleName = "송파구통합도서관";
export const homeUrl = "https://splib.or.kr";

const SEARCH_URL = `${homeUrl}/intro/program/plusSearchResultList.do`;
const DETAIL_URL = `${homeUrl}/intro/menu/10003/program/30001/plusSearchResultDetail.do`;
// 응답 시간이 페이지 크기에 비례한다 (20=1.5s, 50=2.6s, 100=5.0s)
const RECORD_COUNT = 20;
const DETAIL_RE = /fnSearchResultDetail\((\d+),\s*(\d+),\s*'([^']+)'\)/;

// 소나무언덕4호도서관(BD)은 폼에 있지만 어떤 검색어로도 0건이라 뺐다
const libraryList: LibraryInfo[] = [
  { code: "ME", name: "송파글마루도서관" },
  { code: "MA", name: "송파어린이도서관" },
  { code: "MH", name: "송파위례도서관" },
  { code: "MB", name: "거마도서관" },
  { code: "MF", name: "돌마리도서관" },
  { code: "BA", name: "풍납도서관" },
  { code: "BB", name: "소나무언덕2호도서관" },
  { code: "BC", name: "소나무언덕3호도서관" },
  { code: "MC", name: "소나무언덕잠실본동도서관" },
  { code: "MD", name: "송파어린이영어도서관" },
  { code: "MG", name: "가락몰도서관" },
  { code: "BE", name: "송이골작은도서관" },
  { code: "QA", name: "송파스마트도서관(잠실나루역)" },
  { code: "QB", name: "송파스마트도서관(방이역)" },
  { code: "QC", name: "송파스마트도서관(마천역)" },
  { code: "QD", name: "송파스마트도서관(거여역)" },
  { code: "QE", name: "송파스마트도서관(장지역)" },
  { code: "QF", name: "송파스마트도서관(잠실2동주민센터)" },
  { code: "QG", name: "송파스마트도서관(책박물관)" },
  { code: "QH", name: "송파스마트도서관(잠실근린공원)" },
  { code: "QI", name: "송파스마트도서관(풍납동)" },
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
      searchKey: "ALL",
      searchKeyword: title,
      searchLibraryArr: lcode,
      searchRecordCount: RECORD_COUNT,
      currentPageNo: opt.startPage ?? 1,
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const {
    window: { document },
  } = new JSDOM(body);

  // 검색결과 총 <span class="highlight">815</span>건
  const countText =
    document.querySelector("div.result_screen")?.textContent ?? "";
  const countMatch = countText.match(/총\s*([\d,]+)\s*건/);
  const totalBookCount = countMatch
    ? parseInt(countMatch[1].replace(/,/g, ""), 10)
    : 0;

  const booklist: Book[] = [];

  document.querySelectorAll("ul.listWrap div.bookArea").forEach((item) => {
    const link = item.querySelector("div.book_name a");
    const match = link?.getAttribute("onclick")?.match(DETAIL_RE);

    if (!match) return;

    const bookTitle =
      link?.querySelector("span.title")?.textContent?.trim() ?? "";

    if (!bookTitle) return;

    const [, recKey, bookKey, publishFormCode] = match;
    const bookUrl =
      `${DETAIL_URL}?recKey=${recKey}&bookKey=${bookKey}` +
      `&publishFormCode=${encodeURIComponent(publishFormCode)}`;

    const status =
      item.querySelector("div.bookBtnWrap span.status")?.textContent ?? "";

    booklist.push({
      libraryName:
        item
          .querySelector("div.book_info.info03 span")
          ?.textContent?.trim() || libraryName,
      title: bookTitle,
      bookUrl,
      exist: status.includes("대출가능"),
    });
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
