import { request } from "undici";
import {
  getLibraryNames as getLibNames,
  createLibraryCodeLookup,
  validateSearchOptions,
  wrapWithCallback,
  stripHtml,
} from "../util";
import type {
  Book,
  LibraryInfo,
  LibraryModule,
  SearchOptions,
  SearchResult,
} from "../types";

export const moduleName = "부천시립도서관";
export const homeUrl = "https://alpasq.bcl.go.kr";

// 시립도서관만 포함 (작은도서관/스마트도서관 제외 — 동시 요청 수 제한)
const libraryList: LibraryInfo[] = [
  { code: "AA", name: "부천시립상동도서관" },
  { code: "AB", name: "부천시립원미도서관" },
  { code: "AC", name: "부천시립심곡도서관" },
  { code: "AD", name: "부천시립북부도서관" },
  { code: "AE", name: "부천시립꿈빛도서관" },
  { code: "AF", name: "부천시립책마루도서관" },
  { code: "AG", name: "부천시립한울빛도서관" },
  { code: "AH", name: "부천시립꿈여울도서관" },
  { code: "AI", name: "부천시립송내도서관" },
  { code: "AJ", name: "부천시립오정도서관" },
  { code: "AK", name: "부천시립도당도서관" },
  { code: "AL", name: "부천시립동화도서관" },
  { code: "AM", name: "부천시립역곡도서관" },
  { code: "AN", name: "부천시립별빛마루도서관" },
  { code: "AO", name: "부천시립수주도서관" },
  { code: "AY", name: "부천시립역곡밝은도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

interface BclBook {
  originalTitle: string;
  bookKey: string;
  speciesKey: string;
  isbn: string;
  pubFormCode: string;
  loanStatus: string;
  libName: string;
  manageCode: string;
}

interface BclApiResponse {
  result: { code: string };
  contents: {
    totalCount: number;
    bookList: BclBook[];
  };
}

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const res = await request(`${homeUrl}/api/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    body: JSON.stringify({
      searchKeyword: title,
      pubFormCode: "ALL",
      display: "20",
      article: "TITLE",
      order: "DESC",
      manageCode: lcode,
    }),
    signal,
  });

  if (res.statusCode !== 200) {
    throw new Error(`HTTP ${res.statusCode}`);
  }

  const json = (await res.body.json()) as BclApiResponse;
  const totalBookCount = json.contents?.totalCount ?? 0;
  const booklist: Book[] = (json.contents?.bookList ?? []).map((book) => {
    const bookKey = book.bookKey.split(",")[0];
    const speciesKey = book.speciesKey.split(",")[0];
    return {
      title: stripHtml(book.originalTitle),
      exist: book.loanStatus === "대출가능",
      libraryName: book.libName.split(",")[0],
      bookUrl: `${homeUrl}/singleBook/${bookKey}/${speciesKey}/${book.isbn || "0"}/${book.pubFormCode}/${book.manageCode}`,
    };
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
