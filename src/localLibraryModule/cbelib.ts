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

export const moduleName = "충청북도교육도서관";
export const homeUrl = "https://www.cbelib.go.kr";

const libraryList: LibraryInfo[] = [
  { code: "MA", name: "충청북도교육도서관" },
  { code: "MB", name: "충북교육문화원" },
  { code: "MC", name: "중원교육문화원" },
  { code: "MD", name: "중원교육도서관" },
  { code: "ME", name: "제천학생회관" },
  { code: "MF", name: "미원교육도서관" },
  { code: "MG", name: "보은교육도서관" },
  { code: "MH", name: "옥천교육도서관" },
  { code: "MI", name: "영동교육도서관" },
  { code: "MJ", name: "진천교육도서관" },
  { code: "MK", name: "괴산교육도서관" },
  { code: "ML", name: "증평교육도서관" },
  { code: "MM", name: "음성교육도서관" },
  { code: "MN", name: "금왕교육도서관" },
  { code: "MO", name: "단양교육도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

const BASE_URL = "https://www.cbelib.go.kr:7443/dls_le/index.php";

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
      manageCode: lcode,
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  // Extract total count from "총 <strong class="cyan">118780권(개)</strong>"
  const countStrong = document.querySelector("h3 > strong.cyan");
  const count = extractNumber(countStrong?.textContent);

  const booklist: Book[] = [];
  const bookItems = document.querySelectorAll("dl");
  bookItems.forEach((dl) => {
    // Skip template dl (has id="aTitle" placeholder)
    if (dl.querySelector("#aTitle")) return;

    // Get title from dd > div.ico > a
    const titleLink = dl.querySelector("dd > div.ico > a");
    const bookTitle = titleLink?.textContent?.trim() ?? "";

    // Get book URL from dt > a href
    let bookUrl = "";
    const dtLink = dl.querySelector("dt > a");
    const href = dtLink?.getAttribute("href") ?? "";
    if (href && href !== "#") {
      const path = href.startsWith("./") ? href.slice(1) : href;
      bookUrl = `https://www.cbelib.go.kr:7443/dls_le${path}`;
    }

    // Get availability from ol > li > strong text
    const statusEl = dl.querySelector("ol > li > strong");
    const statusText = statusEl?.textContent?.trim() ?? "";
    const exist = statusText.includes("대출가능");

    // Get library name from li.so > span.blue
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
