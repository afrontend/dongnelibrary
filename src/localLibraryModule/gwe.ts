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

export const moduleName = "강원특별자치도교육청도서관";
export const homeUrl = "https://lib.gwe.go.kr";

const SEARCH_URL = `${homeUrl}/portal/menu/568/book/search`;
const DETAIL_BASE = `${homeUrl}/portal/menu/568/book/view`;

// 서버 하드 리밋 약 360 → 안전값 300 (3.2초 이내)
const MAX_SIZE = 300;

const libraryList: LibraryInfo[] = [
  { code: "MA", name: "춘천교육문화관" },
  { code: "MC", name: "강릉교육문화관" },
  { code: "ME", name: "삼척교육문화관" },
  { code: "MD", name: "속초교육문화관" },
  { code: "MB", name: "원주교육문화관" },
  { code: "MX", name: "고성교육도서관" },
  { code: "MY", name: "동해교육도서관" },
  { code: "MH", name: "명주교육도서관" },
  { code: "MG", name: "문막교육도서관" },
  { code: "MJ", name: "속초교육도서관" },
  { code: "MV", name: "양구교육도서관" },
  { code: "MK", name: "양양교육도서관" },
  { code: "MQ", name: "영월교육도서관" },
  { code: "MW", name: "인제교육도서관" },
  { code: "MS", name: "정선교육도서관" },
  { code: "MT", name: "철원교육도서관" },
  { code: "MF", name: "춘성교육도서관" },
  { code: "MM", name: "태백교육도서관" },
  { code: "MR", name: "평창교육도서관" },
  { code: "MN", name: "홍천교육도서관" },
  { code: "MU", name: "화천교육도서관" },
  { code: "MP", name: "횡성교육도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { body } = await get(SEARCH_URL, {
    qs: {
      search: "true",
      searchInput: title,
      searchCondition: "searchTxt",
      manageCodes: lcode,
      size: String(MAX_SIZE),
      page: "1",
    },
    signal,
  });

  const totalMatch = body.match(/검색결과\s*총\s*<strong>([\d,]+)<\/strong>건/);
  const totalBookCount = totalMatch ? extractNumber(totalMatch[1]) : 0;

  const {
    window: { document },
  } = new JSDOM(body);

  const bookDivs = document.querySelectorAll<HTMLElement>("div.bookData");
  const booklist: Book[] = [];

  for (const div of bookDivs) {
    const bookTitle = div.dataset.title?.trim() ?? "";
    const regNo = div.dataset.regNo?.trim() ?? "";
    const libName = div.dataset.libName?.trim() ?? "";

    if (!bookTitle || !regNo) continue;

    const bookUrl = `${DETAIL_BASE}/${regNo}?booktype=`;

    booklist.push({
      libraryName: libName,
      title: bookTitle,
      bookUrl,
      exist: false,
    });
  }

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
