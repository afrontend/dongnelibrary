import {
  getLibraryNames as getLibNames,
  createLibraryCodeLookup,
  validateSearchOptions,
  wrapWithCallback,
} from "../util";
import { createSession } from "../http";
import type {
  Book,
  LibraryInfo,
  LibraryModule,
  SearchOptions,
  SearchResult,
} from "../types";

export const moduleName = "수원시도서관";
export const homeUrl = "https://www.suwonlib.go.kr";

const libraryList: LibraryInfo[] = [
  { code: "141025", name: "선경도서관" },
  { code: "141024", name: "수원중앙도서관" },
  { code: "141549", name: "창룡도서관" },
  { code: "141572", name: "화서다산도서관" },
  { code: "141552", name: "호매실도서관" },
  { code: "141093", name: "서수원도서관" },
  { code: "141542", name: "한림도서관" },
  { code: "141550", name: "버드내도서관" },
  { code: "141092", name: "북수원도서관" },
  { code: "141537", name: "대추골도서관" },
  { code: "141557", name: "일월도서관" },
  { code: "141551", name: "광교홍재도서관" },
  { code: "141301", name: "태장마루도서관" },
  { code: "141595", name: "광교푸른숲도서관" },
  { code: "141596", name: "매여울도서관" },
  { code: "141612", name: "망포글빛도서관" },
  { code: "141085", name: "슬기샘도서관" },
  { code: "141086", name: "지혜샘어린이도서관" },
  { code: "141087", name: "바른샘어린이도서관" },
  { code: "141064", name: "한아름도서관" },
  { code: "141138", name: "반달어린이도서관" },
  { code: "341147", name: "사랑샘도서관" },
  { code: "141107", name: "희망샘도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

function stripHtml(str: string | undefined): string {
  return str ? str.replace(/<[^>]*>/g, "") : "";
}

interface SuwonBook {
  TITLE_INFO?: string;
  LOAN_CODE?: string;
  LIB_NAME?: string;
  MANAGE_CODE?: string;
  ISBN?: string;
  BOOK_KEY?: string;
}

interface SuwonApiResponse {
  SEARCH_RESULT?: {
    SEARCH_LIST?: SuwonBook[];
    SEARCH_COUNT?: number;
  };
}

function getBookList(data: SuwonApiResponse): Book[] {
  if (!data.SEARCH_RESULT || !data.SEARCH_RESULT.SEARCH_LIST) {
    return [];
  }
  return data.SEARCH_RESULT.SEARCH_LIST.map(function (book: SuwonBook): Book {
    let bookUrl = "";
    if (book.MANAGE_CODE && book.ISBN && book.BOOK_KEY) {
      bookUrl = `https://search.suwonlib.go.kr/detail/${book.MANAGE_CODE}/${book.ISBN}/${book.BOOK_KEY}`;
    }
    return {
      title: stripHtml(book.TITLE_INFO || ""),
      exist: book.LOAN_CODE === "OK",
      libraryName: book.LIB_NAME || "",
      bookUrl,
    };
  });
}

/**
 * Search for books in Suwon City Libraries.
 */
async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  // Create a session to maintain cookies
  const session = createSession();

  // First, visit the search page to initialize session
  await session.get("https://search.suwonlib.go.kr/search", { signal });

  // Now make the API call with the session cookies
  const { statusCode, body } = await session.post(
    "https://search.suwonlib.go.kr/getSearchResult/normal",
    {
      form: {
        searchTxt: title,
        kCid: "",
        kdcValue: "",
        searchKind: "book",
        manageCode: lcode,
        isInnerSearch: "F",
        innerSearchTxt: "",
        keywordSearch: false,
        displayNo: "1000",
        orderbyItem: "ACCURACY_SORT",
        orderby: "DESC",
        pageNo: "1",
        facetLib: "",
        facetLibName: "",
        facetAuthor: "",
        facetPublisher: "",
        facetPubYear: "",
        facetSubject: "",
        facetSubjectName: "",
        facetMedia: "",
        facetMediaName: "",
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Referer: "https://search.suwonlib.go.kr/search",
        "X-Requested-With": "XMLHttpRequest",
        ajax: "true",
      },
      signal,
    },
  );

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const data = JSON.parse(body) as SuwonApiResponse;
  const booklist = getBookList(data);
  const totalCount =
    data.SEARCH_RESULT && data.SEARCH_RESULT.SEARCH_COUNT
      ? data.SEARCH_RESULT.SEARCH_COUNT
      : booklist.length;

  return {
    totalBookCount: totalCount,
    booklist,
  };
}

export const search = wrapWithCallback(searchImpl);

export function getLibraryNames(): string[] {
  return getLibNames(libraryList);
}

({ moduleName, homeUrl, search, getLibraryNames }) satisfies LibraryModule;
