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

export const moduleName = "목포시통합도서관";
export const homeUrl = "https://www.mokpolib.or.kr";

const libraryList: LibraryInfo[] = [
  { code: "MA", name: "목포시립도서관" },
  { code: "MX", name: "목포어울림도서관" },
  { code: "MJ", name: "목포어린이도서관" },
  { code: "MQ", name: "목포영어도서관" },
  { code: "ME", name: "꿈나무작은도서관" },
  { code: "MB", name: "꿈돌이작은도서관" },
  { code: "MS", name: "노을작은도서관" },
  { code: "MW", name: "늘푸른작은도서관" },
  { code: "MH", name: "무지개작은도서관" },
  { code: "MF", name: "반딧불작은도서관" },
  { code: "MP", name: "삼학작은도서관" },
  { code: "MV", name: "샛별작은도서관" },
  { code: "MO", name: "소나무작은도서관" },
  { code: "MN", name: "숲속작은도서관" },
  { code: "MK", name: "연꽃작은도서관" },
  { code: "MD", name: "옹달샘작은도서관" },
  { code: "MC", name: "은하수작은도서관" },
  { code: "MM", name: "청개구리작은도서관" },
  { code: "MI", name: "초롱초롱작은도서관" },
  { code: "ML", name: "푸른솔작은도서관" },
  { code: "MU", name: "푸른숲작은도서관" },
  { code: "MR", name: "행복마을작은도서관" },
  { code: "MT", name: "호돌이작은도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

const BASE_URL = "https://www.mokpolib.or.kr/dls_lt/index.php";

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { statusCode, body } = await get(BASE_URL, {
    qs: {
      mod: "wdDataSearch",
      act: "searchResultList",
      "searchItem[]": "title",
      "searchWord[]": title,
      manageCode: lcode,
      listNum: "50",
      keyword: "",
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
    const detailHref = dl.querySelector("dt > a")?.getAttribute("href") ?? "";
    const jongKeyMatch = detailHref.match(/jongKey=(\d+)/);
    const dbTypeMatch = detailHref.match(/dbType=([^&]+)/);
    if (jongKeyMatch) {
      const params = new URLSearchParams({
        mod: "wdDataSearch",
        act: "searchResultDetail",
        dbType: dbTypeMatch?.[1] ?? "dan",
        jongKey: jongKeyMatch[1],
      });
      bookUrl = `${BASE_URL}?${params}`;
    }

    const statusText = dl.querySelector("ol > li > strong")?.textContent?.trim() ?? "";
    const exist = statusText.includes("대출가능");

    const libName = dl.querySelector("li.so > span.blue")?.textContent?.trim() ?? "";

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
