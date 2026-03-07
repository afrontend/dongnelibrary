import {
  getLibraryNames as getLibNames,
  createLibraryCodeLookup,
  validateSearchOptions,
  wrapWithCallback,
} from "../util";
import { get } from "../http";
import type {
  Book,
  LibraryInfo,
  LibraryModule,
  SearchOptions,
  SearchResult,
} from "../types";

export const moduleName = "제주시도서관";
export const homeUrl = "https://www.jeju.go.kr/";

const libraryList: LibraryInfo[] = [
  { code: "MJ", name: "한라도서관" },
  { code: "MK", name: "우당도서관" },
  { code: "ML", name: "탐라도서관" },
  { code: "MM", name: "제주시기적의도서관" },
  { code: "MP", name: "애월도서관" },
  { code: "MN", name: "조천읍도서관" },
  { code: "MQ", name: "한경도서관" },
  { code: "MA", name: "삼매봉도서관" },
  { code: "MB", name: "중앙도서관" },
  { code: "MC", name: "동부도서관" },
  { code: "MD", name: "서부도서관" },
  { code: "ME", name: "서귀포기적의도서관" },
  { code: "MH", name: "성산일출도서관" },
  { code: "MF", name: "안덕산방도서관" },
  { code: "MG", name: "표선도서관" },
  { code: "XY", name: "꿈바당어린이도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

const manageCodeToName: Record<string, string> = Object.fromEntries(
  libraryList.map((lib) => [lib.code, lib.name]),
);

interface JejuBook {
  recKey: string;
  title: string;
  author: string;
  manageCode: string;
}

interface JejuSearchResponse {
  books: JejuBook[];
  query: {
    rows: number;
    page: number;
  };
  error: boolean;
}

interface JejuRentStat {
  total: number;
  rent: number;
}

async function fetchRentStat(
  recKey: string,
  signal?: AbortSignal,
): Promise<boolean> {
  try {
    const { statusCode, body } = await get(
      "https://www.jeju.go.kr/tool/lib/rent-stat.jsp",
      { qs: { key: recKey }, signal },
    );
    if (statusCode !== 200) return false;
    const stat = JSON.parse(body) as JejuRentStat;
    return stat.total - stat.rent > 0;
  } catch {
    return false;
  }
}

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const qs: Record<string, string | number> = { q: title };
  if (lcode) {
    qs.lib = lcode;
  }

  const { statusCode, body } = await get(
    "https://www.jeju.go.kr/tool/lib/search.jsp",
    { qs, signal },
  );

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const json = JSON.parse(body) as JejuSearchResponse;

  if (json.error) {
    throw new Error("Search API returned an error");
  }

  const books = json.books ?? [];

  const booklist: Book[] = await Promise.all(
    books.map(async (book) => {
      const exist = await fetchRentStat(book.recKey, signal);
      return {
        title: book.title,
        exist,
        libraryName: manageCodeToName[book.manageCode] ?? libraryName,
        bookUrl: `https://www.jeju.go.kr/lib/service/search/simple.htm?q=${encodeURIComponent(title)}`,
      };
    }),
  );

  return {
    startPage: opt.startPage,
    totalBookCount: json.query.rows,
    booklist,
  };
}

export const search = wrapWithCallback(searchImpl);

export function getLibraryNames(): string[] {
  return getLibNames(libraryList);
}

({ moduleName, homeUrl, search, getLibraryNames }) satisfies LibraryModule;
