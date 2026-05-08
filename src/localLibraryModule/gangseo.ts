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

export const moduleName = "강서구통합도서관";
export const homeUrl = "https://lib.gangseo.seoul.kr";

const libraryList: LibraryInfo[] = [
  { code: "AG", name: "등빛도서관" },
  { code: "BG", name: "가양도서관" },
  { code: "AA", name: "강서영어도서관" },
  { code: "AB", name: "곰달래도서관" },
  { code: "AC", name: "길꽃어린이도서관" },
  { code: "AD", name: "꿈꾸는어린이도서관" },
  { code: "AF", name: "우장산숲속도서관" },
  { code: "AE", name: "푸른들청소년도서관" },
  { code: "AQ", name: "도란도란쉼터" },
  { code: "AL", name: "초록향기" },
  { code: "AR", name: "생각열매" },
  { code: "AJ", name: "글벗누리" },
  { code: "AI", name: "볏고을" },
  { code: "AX", name: "배다리" },
  { code: "AO", name: "채움" },
  { code: "BJ", name: "가람" },
  { code: "AK", name: "역마을" },
  { code: "BB", name: "송정" },
  { code: "BL", name: "솔뫼" },
  { code: "AS", name: "아리향기" },
  { code: "AN", name: "책마루" },
  { code: "BC", name: "수명산" },
  { code: "BI", name: "초록동" },
  { code: "AZ", name: "도리샘" },
  { code: "AW", name: "등마루골" },
  { code: "BD", name: "옹기종기" },
  { code: "AP", name: "방그리나" },
  { code: "BH", name: "꿈자람책놀이터" },
  { code: "BF", name: "해뜰" },
  { code: "AM", name: "옹달샘" },
  { code: "AY", name: "내발산" },
  { code: "AU", name: "꿈터" },
  { code: "AV", name: "허준마을" },
  { code: "BA", name: "책향기" },
  { code: "AT", name: "큰마음" },
  { code: "BM", name: "봉제산책쉼터" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

interface GangseoBook {
  originalTitle: string;
  bookKey: string;
  speciesKey: string;
  isbn: string;
  pubFormCode: string;
  loanStatus: string;
  libName: string;
}

interface GangseoApiResponse {
  result: { code: string };
  contents: {
    totalCount: number;
    bookList: GangseoBook[];
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
      manageCode: [lcode],
    }),
    signal,
  });

  if (res.statusCode !== 200) {
    throw new Error(`HTTP ${res.statusCode}`);
  }

  const json = (await res.body.json()) as GangseoApiResponse;
  const totalBookCount = json.contents.totalCount;
  const booklist: Book[] = json.contents.bookList.map((book) => ({
    title: stripHtml(book.originalTitle),
    exist: book.loanStatus === "대출가능",
    libraryName: book.libName,
    bookUrl: `${homeUrl}/bookDetail/${book.pubFormCode}/${book.bookKey}/${book.speciesKey}/${book.isbn}`,
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
