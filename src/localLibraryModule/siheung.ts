import { Agent, request } from "undici";
import {
  getLibraryNames as getLibNames,
  createLibraryCodeLookup,
  validateSearchOptions,
  wrapWithCallback,
} from "../util";

// lib.siheung.go.kr 서버 인증서 체인에 중간 CA가 누락되어 있음
const dispatcher = new Agent({ connect: { rejectUnauthorized: false } });
import type {
  Book,
  LibraryInfo,
  LibraryModule,
  SearchOptions,
  SearchResult,
} from "../types";

export const moduleName = "시흥시도서관";
export const homeUrl = "https://lib.siheung.go.kr";

const libraryList: LibraryInfo[] = [
  { code: "1", name: "중앙도서관" },
  { code: "2", name: "대야도서관" },
  { code: "3", name: "소래빛도서관" },
  { code: "4", name: "월곶도서관" },
  { code: "10", name: "정왕어린이도서관" },
  { code: "11", name: "군자도서관" },
  { code: "12", name: "능곡도서관" },
  { code: "13", name: "신천도서관" },
  { code: "14", name: "매화도서관" },
  { code: "16", name: "장곡도서관" },
  { code: "73", name: "목감도서관" },
  { code: "75", name: "배곧도서관" },
  { code: "81", name: "은계도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

interface SiheungVolume {
  name: string;
  cState: string;
}

interface SiheungBook {
  id?: number;
  titleStatement: string;
  branchVolumes: SiheungVolume[];
}

interface SiheungApiResponse {
  data?: {
    totalCount: number;
    list: SiheungBook[];
  };
}

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const branch = getLibraryCode(libraryName);

  const qs = new URLSearchParams({
    all: `k|a|${title}`,
    branch: String(branch),
    max: "200",
  });

  const { statusCode, body: bodyStream } = await request(
    `https://lib.siheung.go.kr/pyxis-api/1/collections/1/search?${qs}`,
    { dispatcher, signal: signal as AbortSignal },
  );

  const body = await bodyStream.text();

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const json = JSON.parse(body) as SiheungApiResponse;
  const data = json.data;

  if (!data) {
    return { startPage: opt.startPage, totalBookCount: 0, booklist: [] };
  }

  const booklist: Book[] = data.list.map((book) => ({
    title: book.titleStatement,
    exist: book.branchVolumes.some((vol) => vol.cState.includes("대출가능")),
    libraryName: book.branchVolumes.map((vol) => vol.name).join(","),
    bookUrl: book.id
      ? `https://lib.siheung.go.kr/#/search/detail/${book.id}`
      : "",
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
