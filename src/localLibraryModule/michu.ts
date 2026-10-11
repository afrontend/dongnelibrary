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

export const moduleName = "미추홀구립도서관";
export const homeUrl = "https://hnrl.michu.incheon.kr";

const libraryList: LibraryInfo[] = [
  { code: "MA", name: "학나래도서관" },
  { code: "MB", name: "용비도서관" },
  { code: "BN", name: "숭의누리어린이도서관" },
  { code: "BJ", name: "이랑도서관" },
  { code: "BI", name: "장사래어린이도서관" },
  { code: "BH", name: "소금꽃어린이도서관" },
  { code: "BG", name: "한우리어린이도서관" },
  { code: "BE", name: "쑥골어린이도서관" },
  { code: "BD", name: "석바위어린이도서관" },
  { code: "BC", name: "관교어린이도서관" },
  { code: "BB", name: "독정골어린이도서관" },
];

// 응답의 libName 은 "용비" 같은 약칭이라 manageCode 로 정식 이름을 되찾는다
const libraryNameByCode = new Map(libraryList.map((l) => [l.code, l.name]));

const getLibraryCode = createLibraryCodeLookup(libraryList);

interface MichuBook {
  originalTitle: string;
  bookKey: string;
  speciesKey: string;
  isbn: string;
  pubFormCode: string;
  loanStatus: string;
  libName: string;
  manageCode: string;
}

interface MichuApiResponse {
  result: { code: string };
  contents: {
    totalCount: number;
    bookList: MichuBook[];
  };
}

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const res = await request(
    `${homeUrl}/mchglib/api/alpasqSearch/bsch/search.do`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        searchKeyword: title,
        pubFormCode: "ALL",
        page: 1,
        display: 20,
        manageCode: [lcode],
      }),
      signal,
    },
  );

  if (res.statusCode !== 200) {
    throw new Error(`HTTP ${res.statusCode}`);
  }

  const json = (await res.body.json()) as MichuApiResponse;
  const totalBookCount = json.contents?.totalCount ?? 0;
  const booklist: Book[] = (json.contents?.bookList ?? []).map((book) => {
    const bookKey = book.bookKey.split(",")[0];
    const speciesKey = book.speciesKey.split(",")[0];
    return {
      title: stripHtml(book.originalTitle),
      exist: book.loanStatus === "대출가능",
      libraryName:
        libraryNameByCode.get(book.manageCode) ?? book.libName.split(",")[0],
      bookUrl: `${homeUrl}/mchglib/hp/alpasqSearch/bkdt/bdView.do?menuGb=bsch&bookKey=${bookKey}&speciesKey=${speciesKey}&isbn=${book.isbn || "0"}&pubFormCode=${book.pubFormCode}`,
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
