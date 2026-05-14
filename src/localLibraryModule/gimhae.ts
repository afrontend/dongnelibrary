import {
  getLibraryNames as getLibNames,
  createLibraryCodeLookup,
  validateSearchOptions,
  extractNumber,
  wrapWithCallback,
} from "../util";
import { get } from "../http";
import { JSDOM } from "jsdom";
import type {
  Book,
  LibraryInfo,
  LibraryModule,
  SearchOptions,
  SearchResult,
} from "../types";

export const moduleName = "김해통합도서관";
export const homeUrl = "https://lib.gimhae.go.kr";

const SEARCH_URL =
  "http://libbook.gimhae.go.kr:8000/bookv2/smartlib/list.php";
const BOOK_BASE_URL =
  "http://libbook.gimhae.go.kr:8000/bookv2/smartlib/view.php";

const libraryList: LibraryInfo[] = [
  { code: "CA", name: "칠암도서관" },
  { code: "JY", name: "장유도서관" },
  { code: "HJ", name: "화정글샘도서관" },
  { code: "JH", name: "진영한빛도서관" },
  { code: "KG", name: "김해기적의도서관" },
  { code: "YH", name: "김해율하도서관" },
  { code: "MY", name: "김해어린이영어도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { statusCode, body } = await get(SEARCH_URL, {
    qs: {
      skin: "normal",
      stype: "title",
      sstring: title,
      _es: "1",
      "mgns[]": lcode,
      cpage: "1",
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  const tbody = document.querySelector("tbody");
  if (!tbody) {
    return { startPage: opt.startPage, totalBookCount: 0, booklist: [] };
  }

  const rows = Array.from(tbody.querySelectorAll("tr"));
  if (rows.length === 0) {
    return { startPage: opt.startPage, totalBookCount: 0, booklist: [] };
  }

  const firstRowTds = rows[0].querySelectorAll("td");
  const totalBookCount = extractNumber(firstRowTds[0]?.textContent?.trim());

  const booklist: Book[] = [];

  for (const row of rows) {
    const tds = row.querySelectorAll("td");
    if (tds.length < 8) continue;

    const titleLink = tds[1].querySelector("a.h1");
    const bookTitle = titleLink?.textContent?.trim() ?? "";
    if (!bookTitle) continue;

    const href = titleLink?.getAttribute("href") ?? "";
    const recKeyMatch = href.match(/rec_key=(\d+)/);
    const bookUrl = recKeyMatch
      ? `${BOOK_BASE_URL}?rec_key=${recKeyMatch[1]}&data_type=BO`
      : "";

    const statusText = tds[7]?.textContent?.trim() ?? "";
    const exist = statusText.includes("대출가능");

    booklist.push({ libraryName, title: bookTitle, bookUrl, exist });
  }

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
