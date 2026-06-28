import {
  getLibraryNames as getLibNames,
  createLibraryCodeLookup,
  validateSearchOptions,
  wrapWithCallback,
} from "../util";
import { post } from "../http";
import { JSDOM } from "jsdom";
import type {
  Book,
  LibraryInfo,
  LibraryModule,
  SearchOptions,
  SearchResult,
} from "../types";

export const moduleName = "의정부시도서관";
export const homeUrl = "https://www.uilib.go.kr";

const libraryList: LibraryInfo[] = [
  { code: "MC", name: "과학도서관" },
  { code: "MA", name: "정보도서관" },
  { code: "MB", name: "영어도서관" },
  { code: "MD", name: "가재울도서관" },
  { code: "ME", name: "미술도서관" },
  { code: "SS", name: "음악도서관" },
  { code: "SI", name: "의정부1동 작은도서관" },
  { code: "SN", name: "호원1동 작은도서관" },
  { code: "SM", name: "장암동 작은도서관" },
  { code: "SU", name: "신곡2동 작은도서관" },
  { code: "SE", name: "송산1동 작은도서관" },
  { code: "SF", name: "송산2동 작은도서관" },
  { code: "SK", name: "송산3동 작은도서관" },
  { code: "SL", name: "자금동 작은도서관" },
  { code: "SA", name: "가능동 작은도서관" },
  { code: "SR", name: "흥선동 작은도서관" },
  { code: "SD", name: "녹양동 작은도서관" },
  { code: "ST", name: "희망 Library Center" },
  { code: "TC", name: "의정부역 스마트도서관" },
  { code: "TD", name: "회룡역 스마트도서관" },
  { code: "TE", name: "가능역 스마트도서관" },
  { code: "TF", name: "녹양역 스마트도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

const SEARCH_URL = `${homeUrl}/main/intro/search/index.do`;
const DETAIL_BASE = `${homeUrl}/main/intro/search/`;
const ROW_COUNT = 20;

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, startPage = 1, signal } = opt;

  validateSearchOptions(opt);

  const libCode = getLibraryCode(libraryName);

  const { statusCode, body } = await post(SEARCH_URL, {
    form: {
      menu_idx: "9",
      booktype: "ALL",
      title,
      libraryCodes: libCode,
      viewPage: String(startPage),
      rowCount: String(ROW_COUNT),
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const totalMatch = body.match(/검색결과 총 <b>(\d+)<\/b>건/);
  const totalBookCount = totalMatch ? parseInt(totalMatch[1], 10) : 0;

  const {
    window: { document },
  } = new JSDOM(body);

  const booklist: Book[] = [];
  const rows = document.querySelectorAll<HTMLElement>("#search-results .row");

  rows.forEach((row) => {
    const titleLink = row.querySelector<HTMLAnchorElement>("a.name");
    if (!titleLink) return;

    const titleSpan = titleLink.querySelector("span");
    const bookTitle = (
      titleSpan?.textContent ?? titleLink.textContent ?? ""
    ).trim();
    if (!bookTitle) return;

    const href = titleLink.getAttribute("href") ?? "";
    const bookUrl = href ? `${DETAIL_BASE}${href}` : "";

    const rowText = row.textContent ?? "";
    const exist = /대출가능여부[^:]*:\s*대출가능/.test(rowText);

    booklist.push({ libraryName, title: bookTitle, bookUrl, exist });
  });

  return { startPage, totalBookCount, booklist };
}

export const search = wrapWithCallback(searchImpl);

export function getLibraryNames(): string[] {
  return getLibNames(libraryList);
}

({ moduleName, homeUrl, search, getLibraryNames }) satisfies LibraryModule;
