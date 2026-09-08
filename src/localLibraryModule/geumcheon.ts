import {
  getLibraryNames as getLibNames,
  createLibraryCodeLookup,
  validateSearchOptions,
  stripHtml,
  wrapWithCallback,
} from "../util";
import { post } from "../http";
import type {
  Book,
  LibraryInfo,
  LibraryModule,
  SearchOptions,
  SearchResult,
} from "../types";

export const moduleName = "금천구립도서관";
export const homeUrl = "https://geumcheonlib.seoul.kr";

const SEARCH_URL = `${homeUrl}/book/bookSearchList`;
const DETAIL_URL = `${homeUrl}/geumcheonlib/uce/search/detailBookInfo.do`;

// 통합검색 화면의 메뉴 ID. 상세 페이지 링크에도 그대로 붙는다
const SELF_ID = "1097";

// 표시개수. 50건이 약 1.4초
const DISPLAY = 50;

const libraryList: LibraryInfo[] = [
  { code: "MA", name: "독산도서관" },
  { code: "BR", name: "가산도서관" },
  { code: "NR", name: "금나래도서관" },
  { code: "CB", name: "시흥도서관" },
  { code: "SB", name: "책이든거리작은도서관" },
  { code: "CA", name: "참새작은도서관" },
  { code: "DC", name: "청개구리작은도서관" },
  { code: "DD", name: "꿈씨어린이작은도서관" },
  { code: "SD", name: "도란도란작은도서관" },
  { code: "DA", name: "해오름작은도서관" },
  { code: "DB", name: "미래향기작은도서관" },
  { code: "SA", name: "맑은누리작은도서관" },
  { code: "SC", name: "꿈꾸는작은도서관" },
  { code: "SE", name: "행궁마을작은도서관" },
  { code: "SF", name: "책달샘숲속작은도서관" },
  { code: "DF", name: "지혜의숲작은도서관" },
  { code: "PD", name: "책읽는마을작은도서관" },
  { code: "DG", name: "산돌어린이작은도서관" },
  { code: "PA", name: "은행나무어린이작은도서관" },
  { code: "PB", name: "나누리작은도서관" },
  { code: "PC", name: "소망의나무어린이작은도서관" },
  { code: "DE", name: "길빛작은도서관" },
  { code: "GD", name: "가산퍼블릭디자인작은도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

interface GeumcheonBook {
  title?: string;
  loanStatus?: string;
  libName?: string;
  bookKey?: string;
  speciesKey?: string;
  isbn?: string;
  pubFormCode?: string;
}

interface GeumcheonApiResponse {
  totalCount?: number;
  bookList?: GeumcheonBook[];
}

/** 검색어와 일치한 부분이 <span class='highlight'>로 감싸여 오므로 태그를 걷어낸다 */
function getBookTitle(book: GeumcheonBook): string {
  return stripHtml(book.title).trim();
}

function getBookUrl(book: GeumcheonBook): string {
  if (!book.bookKey || !book.speciesKey) return "";

  const params = new URLSearchParams({
    selfId: SELF_ID,
    bookKey: book.bookKey,
    speciesKey: book.speciesKey,
    isbn: book.isbn ?? "",
    pubFormCode: book.pubFormCode ?? "",
  });

  return `${DETAIL_URL}?${params}`;
}

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const manageCode = getLibraryCode(libraryName);

  const { statusCode, body } = await post(SEARCH_URL, {
    form: {
      // searchKeyword는 전체 필드 검색이라 서명 검색인 advTitle을 쓴다
      searchKeyword: "",
      advTitle: title,
      manageCode,
      pubFormCode: "",
      article: "SCORE",
      display: DISPLAY,
      page: opt.startPage ?? 1,
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const json = JSON.parse(body) as GeumcheonApiResponse;

  const booklist: Book[] = (json.bookList ?? [])
    .map((book) => ({
      libraryName: book.libName ?? libraryName,
      title: getBookTitle(book),
      bookUrl: getBookUrl(book),
      exist: book.loanStatus === "대출가능",
    }))
    .filter((book) => book.title);

  return {
    startPage: opt.startPage,
    totalBookCount: json.totalCount ?? booklist.length,
    booklist,
  };
}

export const search = wrapWithCallback(searchImpl);

export function getLibraryNames(): string[] {
  return getLibNames(libraryList);
}

({ moduleName, homeUrl, search, getLibraryNames }) satisfies LibraryModule;
