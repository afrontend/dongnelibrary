import { Agent, request } from "undici";

const dispatcher = new Agent({ connect: { rejectUnauthorized: false } });
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

export const moduleName = "양평군도서관";
export const homeUrl = "https://www.yplib.go.kr";

const libraryList: LibraryInfo[] = [
  { code: "MA", name: "양평도서관" },
  { code: "MD", name: "양서친환경도서관" },
  { code: "ME", name: "양동도서관" },
  { code: "MC", name: "용문도서관" },
  { code: "MH", name: "지평도서관" },
  { code: "MI", name: "강상작은도서관" },
  { code: "MF", name: "강하작은도서관" },
  { code: "MB", name: "옥천작은도서관" },
  { code: "MG", name: "서종작은도서관" },
  { code: "MM", name: "단월작은도서관" },
  { code: "MJ", name: "청운작은도서관" },
  { code: "ML", name: "개군작은도서관" },
  { code: "MN", name: "세미원작은도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

interface YplibBook {
  originalTitle: string;
  bookKey: string;
  loanStatus: string;
  libName: string;
  manageCode: string;
}

interface YplibApiResponse {
  result: { code: string };
  contents: {
    totalCount: number;
    bookList: YplibBook[];
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
      advContentsType: ["ALL"],
      advTitle: title,
      advAuthor: "",
      advPublisher: "",
      advIsbn: "",
      advClassNo: "",
      advFromPubYear: "",
      advToPubYear: "",
      advTextLang: "ALL",
      manageCode: [lcode],
      article: "SCORE",
      display: 500,
      order: "DESC",
      page: 1,
    }),
    signal,
    dispatcher,
  });

  if (res.statusCode !== 200) {
    throw new Error(`HTTP ${res.statusCode}`);
  }

  const json = (await res.body.json()) as YplibApiResponse;
  const totalBookCount = json.contents.totalCount;
  const booklist: Book[] = json.contents.bookList.map((book) => ({
    title: stripHtml(book.originalTitle),
    exist: book.loanStatus === "대출가능",
    libraryName: book.libName,
    bookUrl: `${homeUrl}/searchDetail?bookKey=${book.bookKey}`,
  }));

  return {
    totalBookCount,
    booklist,
  };
}

export const search = wrapWithCallback(searchImpl);

export function getLibraryNames(): string[] {
  return getLibNames(libraryList);
}

({ moduleName, homeUrl, search, getLibraryNames }) satisfies LibraryModule;
