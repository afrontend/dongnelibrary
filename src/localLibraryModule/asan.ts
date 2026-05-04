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

export const moduleName = "아산시도서관";
export const homeUrl = "https://ascl.asan.go.kr";

const libraryList: LibraryInfo[] = [
  { code: "MF", name: "아산중앙도서관" },
  { code: "MC", name: "배방도서관" },
  { code: "MB", name: "둔포도서관" },
  { code: "CH", name: "꿈샘어린이청소년도서관" },
  { code: "ME", name: "탕정온샘도서관" },
  { code: "MH", name: "음봉어울샘도서관" },
  { code: "MI", name: "배방월천도서관" },
  { code: "NW", name: "노동자복지관작은도서관" },
  { code: "NU", name: "배방작은도서관" },
  { code: "NY", name: "이지마을작은도서관" },
  { code: "NZ", name: "채움작은도서관" },
  { code: "OA", name: "신창늘봄작은도서관" },
  { code: "OB", name: "열린작은도서관" },
  { code: "NX", name: "신창다문화작은도서관" },
  { code: "NV", name: "탕정작은도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

const BASE_URL = "https://lib.asan.go.kr/dls_le/index.php";

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { statusCode, body } = await get(BASE_URL, {
    qs: {
      mod: "wdDataSearch",
      act: "searchIList",
      word: title,
      item: "title",
      limit: "1000",
      manageCode: lcode,
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  const countStrong = document.querySelector("h3 > strong.cyan");
  const count = extractNumber(countStrong?.textContent);

  const booklist: Book[] = [];
  const bookItems = document.querySelectorAll("dl");
  bookItems.forEach((dl) => {
    if (dl.querySelector("#aTitle")) return;

    const titleLink = dl.querySelector("dd > div.ico > a");
    const bookTitle = titleLink?.textContent?.trim() ?? "";

    let bookUrl = "";
    const dtLink = dl.querySelector("dt > a");
    const href = dtLink?.getAttribute("href") ?? "";
    if (href && href !== "#") {
      // Extract jongKey to build a stable URL (strip time= and other volatile params)
      const jongKeyMatch = href.match(/jongKey=(\d+)/);
      const regCodeMatch = href.match(/regCode=([^&]+)/);
      const dbTypeMatch = href.match(/dbType=([^&]+)/);
      if (jongKeyMatch) {
        const params = new URLSearchParams({
          mod: "wdDataSearch",
          act: "searchResultDetail",
          regCode: regCodeMatch?.[1] ?? "WM",
          dbType: dbTypeMatch?.[1] ?? "dan",
          jongKey: jongKeyMatch[1],
        });
        bookUrl = `${BASE_URL}?${params}`;
      }
    }

    const statusEl = dl.querySelector("ol > li > strong");
    const statusText = statusEl?.textContent?.trim() ?? "";
    const exist = statusText.includes("대출가능");

    const libNameEl = dl.querySelector("li.so > span.blue");
    const libName = libNameEl?.textContent?.trim() ?? "";

    if (bookTitle) {
      booklist.push({
        libraryName: libName || libraryName,
        title: bookTitle,
        bookUrl,
        maxoffset: count,
        exist,
      });
    }
  });

  return {
    startPage: opt.startPage,
    totalBookCount: count,
    booklist,
  };
}

export const search = wrapWithCallback(searchImpl);

export function getLibraryNames(): string[] {
  return getLibNames(libraryList);
}

({ moduleName, homeUrl, search, getLibraryNames }) satisfies LibraryModule;
