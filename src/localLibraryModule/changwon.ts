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

export const moduleName = "창원시도서관";
export const homeUrl = "https://lib.changwon.go.kr";

// 시립 공공도서관만 포함 (작은도서관·평생학습센터 제외)
const libraryList: LibraryInfo[] = [
  { code: "MA", name: "창원중앙도서관" },
  { code: "MB", name: "성산도서관" },
  { code: "MC", name: "고향의봄도서관" },
  { code: "MD", name: "상남도서관" },
  { code: "ME", name: "마산회원도서관" },
  { code: "MG", name: "마산합포도서관" },
  { code: "MH", name: "마산중리초등복합시설도서관" },
  { code: "MJ", name: "진해도서관" },
  { code: "MK", name: "동부도서관" },
  { code: "MM", name: "명곡도서관" },
  { code: "MN", name: "진해기적의도서관" },
  { code: "MO", name: "최윤덕도서관" },
  { code: "MP", name: "진해아트홀도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

interface ChangwonBook {
  originalTitle: string;
  bookKey: string;
  speciesKey: string;
  pubFormCode: string;
  manageCode: string;
  libName: string;
  loanStatus: string;
}

interface ChangwonApiResponse {
  apiResponse?: {
    status?: string;
    message?: {
      totalCount?: number;
      bookList?: ChangwonBook[];
    };
  };
  result?: ChangwonBook[];
}

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);
  const { statusCode, body } = await get(`${homeUrl}/book/data2.php`, {
    qs: {
      search_title: title,
      manage_code: lcode,
      pageno: opt.startPage ?? 1,
      display: 40,
      search_type: "detail",
      lib_code: "uc",
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const json = JSON.parse(body) as ChangwonApiResponse;
  const message = json.apiResponse?.message;
  const rows = json.result ?? message?.bookList ?? [];
  const totalBookCount = message?.totalCount ?? 0;
  const booklist: Book[] = rows.map((book) => ({
    title: book.originalTitle,
    exist: book.loanStatus === "대출가능",
    libraryName: book.libName,
    bookUrl:
      `${homeUrl}/book/dataView2.php?lib_code=uc` +
      `&book_key=${encodeURIComponent(book.bookKey)}` +
      `&species_key=${encodeURIComponent(book.speciesKey)}` +
      `&pub_form_code=${encodeURIComponent(book.pubFormCode)}` +
      `&manage_code=${encodeURIComponent(book.manageCode)}` +
      "&page_type=search",
  }));

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
