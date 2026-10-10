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

export const moduleName = "완주군립도서관";
export const homeUrl = "https://lib.wanju.go.kr:31824";

const libraryList: LibraryInfo[] = [
  { code: "MB", name: "중앙도서관" },
  { code: "BR", name: "고산도서관" },
  { code: "MA", name: "삼례도서관" },
  { code: "MC", name: "둔산영어도서관" },
  { code: "MP", name: "콩쥐팥쥐도서관" },
  { code: "BT", name: "고운삼봉도서관" },
  { code: "MD", name: "이서배꽃뜰작은도서관" },
  { code: "MF", name: "상관기찻길작은도서관" },
  { code: "ME", name: "구이모악작은도서관" },
  { code: "MJ", name: "소양철쭉작은도서관" },
  { code: "MK", name: "화산골작은도서관" },
  { code: "MG", name: "경천애인작은도서관" },
  { code: "MN", name: "용꿈작은도서관" },
  { code: "MU", name: "구름골작은도서관" },
  { code: "MV", name: "가온새마을작은도서관" },
];

// 응답의 libName 은 "중앙" 같은 약칭이라 manageCode 로 정식 이름을 되찾는다
const libraryNameByCode = new Map(libraryList.map((l) => [l.code, l.name]));

const getLibraryCode = createLibraryCodeLookup(libraryList);

interface WanjuBook {
  originalTitle: string;
  bookKey: string;
  speciesKey: string;
  isbn: string;
  pubFormCode: string;
  loanStatus: string;
  libName: string;
  manageCode: string;
}

interface WanjuApiResponse {
  result: { code: string };
  contents: {
    totalCount: number;
    bookList: WanjuBook[];
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

  const json = (await res.body.json()) as WanjuApiResponse;
  const totalBookCount = json.contents?.totalCount ?? 0;
  const booklist: Book[] = (json.contents?.bookList ?? []).map((book) => {
    const bookKey = book.bookKey.split(",")[0];
    const speciesKey = book.speciesKey.split(",")[0];
    return {
      title: stripHtml(book.originalTitle),
      exist: book.loanStatus === "대출가능",
      libraryName:
        libraryNameByCode.get(book.manageCode) ?? book.libName.split(",")[0],
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
