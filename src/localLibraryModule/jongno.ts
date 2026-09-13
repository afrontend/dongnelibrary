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

export const moduleName = "종로구립도서관";
export const homeUrl = "https://lib.jongno.go.kr";

const libraryList: LibraryInfo[] = [
  { code: "MA", name: "청운문학도서관" },
  { code: "MT", name: "어린이청소년 국학도서관" },
  { code: "MU", name: "창신소담도서관" },
  { code: "MB", name: "아름꿈 도서관" },
  { code: "MS", name: "우리소리도서관" },
  { code: "MD", name: "통인 어린이 작은도서관" },
  { code: "MR", name: "도담도담 한옥도서관" },
  { code: "ME", name: "청운효자동 북카페" },
  { code: "MF", name: "꿈꾸는 평창동 작은도서관" },
  { code: "MG", name: "무악다솜방" },
  { code: "MH", name: "홍파랑 북카페" },
  { code: "MJ", name: "지혜만들기 작은도서관" },
  { code: "MK", name: "이화마을 작은도서관" },
  { code: "ML", name: "혜화마을 북카페" },
  { code: "MP", name: "숭인마루 작은도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

const SEARCH_URL = `${homeUrl}/menu/subpage/subpage_02/sub01.php`;

// 페이지 크기는 서버 고정값이며 어떤 파라미터로도 바꿀 수 없다.
const PAGE_SIZE = 5;

/**
 * 검색 결과의 각 항목은 `<input type="hidden" id="{FIELD}{index}">` 로 실려 온다.
 */
function getField(document: Document, field: string, index: number): string {
  const el = document.getElementById(`${field}${index}`);
  return el?.getAttribute("value")?.trim() ?? "";
}

function getBookList(document: Document): Book[] {
  const booklist: Book[] = [];

  for (let i = 0; ; i += 1) {
    const bookTitle = getField(document, "TITLE_INFO", i);
    if (!bookTitle) break;

    const isbn = getField(document, "ISBN", i);
    const bookUrl = isbn
      ? `${SEARCH_URL}?search_type=detail&library=ALL&search_isbn_issn=${encodeURIComponent(isbn)}`
      : "";

    booklist.push({
      title: bookTitle,
      libraryName: getField(document, "LIB_NAME", i),
      bookUrl,
      exist: getField(document, "LOAN_CODE", i) === "OK",
    });
  }

  return booklist;
}

/**
 * 총 건수 표시가 없어 페이지네이션의 마지막 페이지 번호로 대신한다.
 * 페이지가 하나뿐이면 링크 자체가 없다.
 */
function getLastPage(document: Document): number {
  let lastPage = 1;

  document
    .querySelectorAll<HTMLAnchorElement>("a.pg_page")
    .forEach((anchor) => {
      const matched = /[?&]page=(\d+)/.exec(anchor.getAttribute("href") ?? "");
      if (!matched) return;
      const page = parseInt(matched[1], 10);
      if (page > lastPage) lastPage = page;
    });

  return lastPage;
}

async function fetchPage(
  title: string,
  lcode: string,
  page: number,
  signal: SearchOptions["signal"],
): Promise<Document> {
  const { statusCode, body } = await get(SEARCH_URL, {
    qs: {
      library: lcode,
      search_type: "normal",
      search_value: title,
      page: String(page),
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  return new JSDOM(body).window.document;
}

/**
 * Search for books in Jongno-gu Libraries.
 */
async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, startPage = 1, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const document = await fetchPage(title, lcode, startPage, signal);
  const booklist = getBookList(document);
  const lastPage = getLastPage(document);

  // 마지막 페이지의 항목 수까지 세면 총 건수가 근사치가 아니라 정확한 값이 된다.
  let totalBookCount = booklist.length;
  if (lastPage > 1) {
    const lastDocument = await fetchPage(title, lcode, lastPage, signal);
    totalBookCount =
      (lastPage - 1) * PAGE_SIZE + getBookList(lastDocument).length;
  }

  return { startPage, totalBookCount, booklist };
}

export const search = wrapWithCallback(searchImpl);

export function getLibraryNames(): string[] {
  return getLibNames(libraryList);
}

({ moduleName, homeUrl, search, getLibraryNames }) satisfies LibraryModule;
