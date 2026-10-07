import {
  getLibraryNames as getLibNames,
  createLibraryCodeLookup,
  validateSearchOptions,
  extractNumber,
  wrapWithCallback,
} from "../util";
import { get, post } from "../http";
import { JSDOM } from "jsdom";
import type {
  Book,
  LibraryInfo,
  LibraryModule,
  SearchOptions,
  SearchResult,
} from "../types";

export const moduleName = "안양시도서관";
export const homeUrl = "https://lib.anyang.go.kr";

const SEARCH_URL =
  `${homeUrl}/intro/menu/10003/program/30001/searchResultList.do`;
const DETAIL_URL =
  `${homeUrl}/intro/menu/10003/program/30001/searchResultDetail.do`;
// 검색 목록에는 소장 도서관·대출 상태가 없어 도서별 소장정보 조각을 따로 받는다
const COLLECTION_URL = `${homeUrl}/search/include/collectionBookList.do`;

const libraryList: LibraryInfo[] = [
  { code: "MA", name: "석수도서관" },
  { code: "MI", name: "만안도서관" },
  { code: "MH", name: "삼덕도서관" },
  { code: "ME", name: "박달도서관" },
  { code: "MB", name: "평촌도서관" },
  { code: "MG", name: "관양도서관" },
  { code: "MC", name: "비산도서관" },
  { code: "MD", name: "호계도서관" },
  { code: "MJ", name: "안양어린이도서관" },
  { code: "MF", name: "벌말도서관" },
  { code: "MO", name: "큰샘어린이도서관" },
  { code: "MK", name: "안양역스마트도서관" },
  { code: "ML", name: "동안구청스마트도서관" },
  { code: "MM", name: "범계스마트도서관" },
  { code: "MN", name: "인덕원역스마트도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

async function isAvailable(
  speciesKey: string,
  pubFormCode: string,
  lcode: string,
  signal?: AbortSignal,
): Promise<boolean> {
  try {
    const { statusCode, body } = await post(COLLECTION_URL, {
      form: { speciesKey, pubFormCode },
      signal,
    });
    if (statusCode !== 200) return false;
    const document = new JSDOM(body).window.document;
    return Array.from(document.querySelectorAll(`tr.${lcode}`)).some((tr) =>
      tr.textContent?.includes("대출가능"),
    );
  } catch {
    return false;
  }
}

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { statusCode, body } = await get(SEARCH_URL, {
    qs: {
      searchType: "SIMPLE",
      searchKeyword: title,
      searchManageCodeArr: lcode,
      searchDisplay: 20,
      currentPageNo: 1,
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const document = new JSDOM(body).window.document;

  const count = extractNumber(
    document.querySelector("#totalCnt")?.textContent ?? "",
  );

  const items = Array.from(document.querySelectorAll("div.bookArea")).flatMap(
    (item) => {
      const titleLink = item.querySelector("a.book_name.kor");
      const bookTitle = titleLink?.textContent?.trim() ?? "";
      const match = (titleLink?.getAttribute("onclick") ?? "").match(
        /fnDetail\('([\d,]+)',\s*'([^']*)',\s*'(\w+)'\)/,
      );
      if (!bookTitle || !match) return [];
      const [, speciesKey, isbn, pubFormCode] = match;
      return [{ bookTitle, speciesKey, isbn, pubFormCode }];
    },
  );

  const booklist: Book[] = await Promise.all(
    items.map(async ({ bookTitle, speciesKey, isbn, pubFormCode }) => ({
      libraryName,
      title: bookTitle,
      bookUrl:
        `${DETAIL_URL}?speciesKey=${encodeURIComponent(speciesKey)}` +
        `&isbn=${isbn}&pubFormCode=${pubFormCode}`,
      maxoffset: count,
      exist: await isAvailable(speciesKey, pubFormCode, lcode, signal),
    })),
  );

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
