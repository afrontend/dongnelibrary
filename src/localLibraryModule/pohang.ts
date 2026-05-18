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

export const moduleName = "포항시립도서관";
export const homeUrl = "https://phlib.pohang.go.kr";

const SEARCH_URL =
  "https://phlib.pohang.go.kr/phlib/intro/search/index.do";
const DETAIL_BASE =
  "https://phlib.pohang.go.kr/phlib/intro/search/detail.do";

const libraryList: LibraryInfo[] = [
  { code: "MD", name: "포은중앙도서관" },
  { code: "MA", name: "대잠도서관" },
  { code: "MB", name: "대잠어린이도서관" },
  { code: "MC", name: "영암도서관" },
  { code: "ME", name: "포은오천도서관" },
  { code: "MF", name: "동해석곡도서관" },
  { code: "MH", name: "연일도서관" },
  { code: "MI", name: "구룡포도서관" },
  { code: "MJ", name: "포은흥해도서관" },
  { code: "PM", name: "어린이영어도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { statusCode, body } = await get(SEARCH_URL, {
    qs: {
      menu_idx: 297,
      search_type2: "TITLE",
      LibraryCodes: lcode,
      booktype: "BOOK",
      search_text: title,
      rowCount: 100,
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  const searchInfoEl = document.querySelector("div.search-info");
  const infoText = searchInfoEl?.textContent ?? "";
  const totalMatch = infoText.match(/총\s*([\d,]+)\s*건/);
  const totalBookCount = totalMatch ? extractNumber(totalMatch[1]) : 0;

  const booklist: Book[] = [];
  const rows = document.querySelectorAll(
    "div#search-results div.imageType div.row",
  );

  rows.forEach((row) => {
    const bif = row.querySelector("div.bif");
    if (!bif) return;

    const titleLink = bif.querySelector("a.goDetail");
    const bookTitle = titleLink?.textContent?.trim() ?? "";
    if (!bookTitle) return;

    const isbn = titleLink?.getAttribute("isbn") ?? "";
    const regNo = titleLink?.getAttribute("regNo") ?? "";
    const manageCode = titleLink?.getAttribute("manageCode") ?? "";
    const bookUrl =
      isbn && regNo
        ? `${DETAIL_BASE}?regNo=${regNo}&isbn=${isbn}&manageCode=${manageCode}&booktype=BOOK&menu_idx=297`
        : "";

    const exist = (row.textContent ?? "").includes("대출가능");

    const pEl = bif.querySelector("p");
    const pText = pEl?.textContent ?? "";
    const libMatch = pText.match(/소장도서관\s*:\s*([^\n\r|]+)/);
    const libName = libMatch?.[1]?.trim() ?? libraryName;

    booklist.push({ libraryName: libName, title: bookTitle, bookUrl, exist });
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
