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

export const moduleName = "연수구립도서관";
export const homeUrl = "https://yspubliclib.go.kr";

const libraryList: LibraryInfo[] = [
  { code: "ME", name: "연수청학도서관" },
  { code: "MS", name: "송도국제도서관" },
  { code: "MB", name: "연수꿈담도서관" },
  { code: "MD", name: "송도국제어린이도서관" },
  { code: "MH", name: "해돋이도서관" },
  { code: "MK", name: "선학별빛도서관" },
  { code: "MM", name: "함박비류도서관" },
  { code: "ML", name: "동춘나래도서관" },
  { code: "MC", name: "옥련1동작은도서관" },
  { code: "BR", name: "옥련2동작은도서관" },
  { code: "MI", name: "연수1동작은도서관" },
  { code: "MG", name: "송도2동작은도서관" },
  { code: "MJ", name: "송도3동작은도서관" },
  { code: "MP", name: "솔안공원작은도서관" },
  { code: "MQ", name: "송도5동작은도서관" },
  { code: "MN", name: "송도4동스마트도서관" },
  { code: "MO", name: "스퀘어원스마트도서관" },
  { code: "MR", name: "연수구청스마트도서관" },
  { code: "MU", name: "해찬솔공원작은도서관" },
  { code: "MV", name: "누리공원작은도서관" },
  { code: "MW", name: "선학역스마트도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

interface YeonsuBook {
  originalTitle: string;
  bookKey: string;
  speciesKey: string;
  isbn: string;
  pubFormCode: string;
  loanStatus: string;
  libName: string;
}

interface YeonsuApiResponse {
  result: { code: string };
  contents: {
    totalCount: number;
    bookList: YeonsuBook[];
  };
}

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const res = await request(`${homeUrl}/api/sch/bsch/search.do`, {
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
      display: 10,
      manageCode: [lcode],
    }),
    signal,
  });

  if (res.statusCode !== 200) {
    throw new Error(`HTTP ${res.statusCode}`);
  }

  const json = (await res.body.json()) as YeonsuApiResponse;
  const totalBookCount = json.contents?.totalCount ?? 0;
  const booklist: Book[] = (json.contents?.bookList ?? []).map((book) => {
    const bookKey = book.bookKey.split(",")[0];
    const speciesKey = book.speciesKey.split(",")[0];
    return {
      title: stripHtml(book.originalTitle),
      exist: book.loanStatus === "대출가능",
      libraryName: book.libName.split(",")[0],
      bookUrl: `${homeUrl}/sch/bkdt/bdView.do?mnidx=10&bookKey=${bookKey}&speciesKey=${speciesKey}&isbn=${book.isbn || "0"}&pubFormCode=${book.pubFormCode}`,
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
