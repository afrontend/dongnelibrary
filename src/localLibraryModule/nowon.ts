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

export const moduleName = "노원구립도서관";
export const homeUrl = "https://www.nowonlib.kr";

const libraryList: LibraryInfo[] = [
  { code: "MA", name: "노원중앙도서관" },
  { code: "MB", name: "노원어린이도서관" },
  { code: "MC", name: "월계도서관" },
  { code: "MD", name: "상계도서관" },
  { code: "ME", name: "불암도서관" },
  { code: "MF", name: "화랑도서관" },
  { code: "MG", name: "노원휴먼라이브러리" },
  { code: "MH", name: "하계어린이도서관" },
  { code: "MI", name: "월계어린이도서관" },
  { code: "SA", name: "공릉행복도서관" },
  { code: "SB", name: "노원문화원 작은도서관" },
  { code: "SC", name: "도란도란 작은도서관" },
  { code: "SD", name: "책이랑 친구랑 작은도서관" },
  { code: "SE", name: "푸른숲 작은도서관" },
  { code: "SF", name: "파랑새 작은도서관" },
  { code: "SG", name: "수락 작은도서관" },
  { code: "SH", name: "해솔 작은도서관" },
  { code: "SI", name: "나무작은도서관" },
  { code: "SJ", name: "노원구청 자료실" },
  { code: "SK", name: "메아리 작은도서관" },
  { code: "SL", name: "반디 작은도서관" },
  { code: "SM", name: "상계숲속 작은도서관" },
  { code: "SN", name: "한울 작은도서관" },
  { code: "SO", name: "가온 작은도서관" },
  { code: "SP", name: "꿈꾸는 작은도서관" },
  { code: "SQ", name: "달내 작은도서관" },
  { code: "SR", name: "초안산숲속 작은도서관" },
  { code: "SS", name: "한내지혜의숲도서관" },
  { code: "ST", name: "한내행복발전소" },
  { code: "SU", name: "책누리 작은도서관" },
  { code: "SV", name: "책사랑북카페 작은도서관" },
  { code: "SW", name: "하늘 작은도서관" },
  { code: "SX", name: "향기나무도서관" },
  { code: "SY", name: "중계사랑 작은도서관" },
  { code: "SZ", name: "가재울 지혜마루 작은도서관" },
  { code: "TA", name: "열린작은도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

interface NowonBook {
  originalTitle: string;
  bookKey: string;
  speciesKey: string;
  isbn: string;
  pubFormCode: string;
  loanStatus: string;
  libName: string;
}

interface NowonApiResponse {
  result: { code: string };
  contents: {
    totalCount: number;
    bookList: NowonBook[];
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
      display: "1000",
      article: "SCORE",
      order: "DESC",
      manageCode: lcode,
    }),
    signal,
  });

  if (res.statusCode !== 200) {
    throw new Error(`HTTP ${res.statusCode}`);
  }

  const json = (await res.body.json()) as NowonApiResponse;
  const totalBookCount = json.contents.totalCount;
  const booklist: Book[] = json.contents.bookList.map((book) => {
    // bookKey and speciesKey may be comma-separated when a book exists in multiple libraries
    const bookKey = book.bookKey.split(",")[0];
    const speciesKey = book.speciesKey.split(",")[0];
    return {
      title: stripHtml(book.originalTitle),
      exist: book.loanStatus === "대출가능",
      libraryName: book.libName.split(",")[0],
      bookUrl: `${homeUrl}/bookDetail/${book.pubFormCode}/${bookKey}/${speciesKey}/${book.isbn}`,
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
