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

export const moduleName = "안산시도서관";
export const homeUrl = "https://lib.ansan.go.kr";

// 시립도서관만 포함 (작은도서관 제외 — 동시 요청 수 제한)
const libraryList: LibraryInfo[] = [
  { code: "MA", name: "중앙도서관" },
  { code: "MD", name: "감골도서관" },
  { code: "MB", name: "관산도서관" },
  { code: "ME", name: "단원어린이도서관" },
  { code: "ND", name: "대부도서관" },
  { code: "NF", name: "미디어도서관" },
  { code: "MH", name: "반월도서관" },
  { code: "MX", name: "본오도서관" },
  { code: "ML", name: "부곡도서관" },
  { code: "NK", name: "상록수도서관" },
  { code: "MF", name: "상록어린이도서관" },
  { code: "NC", name: "선부도서관" },
  { code: "MC", name: "성포도서관" },
  { code: "MS", name: "수암도서관" },
  { code: "MR", name: "원고잔도서관" },
  { code: "NJ", name: "월피예술도서관" },
  { code: "NL", name: "와동교육도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

interface AnsanBook {
  originalTitle: string;
  bookKey: string;
  speciesKey: string;
  isbn: string;
  pubFormCode: string;
  loanStatus: string;
  libName: string;
  manageCode: string;
}

interface AnsanApiResponse {
  result: { code: string };
  contents: {
    totalCount: number;
    bookList: AnsanBook[];
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

  const json = (await res.body.json()) as AnsanApiResponse;
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
