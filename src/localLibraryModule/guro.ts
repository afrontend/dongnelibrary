import { get } from "../http";
import {
  getLibraryNames as getLibNames,
  createLibraryCodeLookup,
  validateSearchOptions,
  wrapWithCallback,
} from "../util";
import type {
  Book,
  LibraryInfo,
  LibraryModule,
  SearchOptions,
  SearchResult,
} from "../types";

export const moduleName = "구로통합도서관";
export const homeUrl = "https://lib.guro.go.kr";

const SEARCH_URL = "https://lib.guro.go.kr/pyxis-api/1/collections/1/search";

// /pyxis-api/1/branches 는 작은도서관·학교·스마트도서관까지 53개를 돌려주므로
// 원장(통합도서관-네트워크-목록.md)의 14개에 맞춰 정식 도서관만 남겼다
const libraryList: LibraryInfo[] = [
  { code: "35", name: "개봉도서관" },
  { code: "59", name: "고척열린도서관" },
  { code: "42", name: "구로기적의도서관" },
  { code: "39", name: "궁동어린이도서관" },
  { code: "36", name: "글마루한옥어린이도서관" },
  { code: "1", name: "꿈나무어린이도서관" },
  { code: "31", name: "꿈마을도서관" },
  { code: "28", name: "온누리도서관" },
  { code: "34", name: "하늘도서관" },
  { code: "57", name: "항동푸른도서관" },
  { code: "32", name: "개봉어린이도서관" },
  { code: "63", name: "구로미래도서관" },
  { code: "64", name: "구로문화누리도서관" },
  { code: "65", name: "구로천왕도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

interface GuroVolume {
  name: string;
  cState: string;
}

interface GuroBook {
  id?: number;
  titleStatement: string;
  branchVolumes: GuroVolume[];
}

interface GuroApiResponse {
  data?: {
    totalCount: number;
    list: GuroBook[];
  };
}

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const branch = getLibraryCode(libraryName);

  const { statusCode, body } = await get(SEARCH_URL, {
    qs: {
      all: `k|a|${title}`,
      branch,
      // max=1000 은 42초 걸린다 (200 은 2.2초)
      max: 200,
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const json = JSON.parse(body) as GuroApiResponse;
  const data = json.data;

  if (!data) {
    return { startPage: opt.startPage, totalBookCount: 0, booklist: [] };
  }

  const booklist: Book[] = data.list.map((book) => ({
    title: book.titleStatement,
    exist: book.branchVolumes.some((vol) => vol.cState.includes("대출가능")),
    libraryName: book.branchVolumes.map((vol) => vol.name).join(","),
    bookUrl: book.id ? `${homeUrl}/#/search/detail/${book.id}` : "",
  }));

  return {
    startPage: opt.startPage,
    totalBookCount: data.totalCount,
    booklist,
  };
}

export const search = wrapWithCallback(searchImpl);

export function getLibraryNames(): string[] {
  return getLibNames(libraryList);
}

({ moduleName, homeUrl, search, getLibraryNames }) satisfies LibraryModule;
