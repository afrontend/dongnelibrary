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

export const moduleName = "천안시도서관";
export const homeUrl = "https://kolas.cheonan.go.kr";

const libraryList: LibraryInfo[] = [
  { code: "MA", name: "중앙도서관" },
  { code: "SY", name: "쌍용도서관" },
  { code: "DJ", name: "두정도서관" },
  { code: "SC", name: "신방도서관" },
  { code: "DS", name: "도솔도서관" },
  { code: "CS", name: "청수도서관" },
  { code: "BC", name: "아우내도서관" },
  { code: "BR", name: "성거도서관" },
  { code: "WT", name: "직산도서관" },
  { code: "IB", name: "일봉동작은도서관" },
  { code: "JA", name: "중앙동작은도서관" },
  { code: "MC", name: "목천작은도서관" },
  { code: "PS", name: "풍세면작은도서관" },
  { code: "SA", name: "신안동작은도서관" },
  { code: "SG", name: "성정1동작은도서관" },
  { code: "SN", name: "성남면작은도서관" },
  { code: "WS", name: "원성2동작은도서관" },
  { code: "SB", name: "천안축구센터작은도서관" },
  { code: "BM", name: "북면바로내작은도서관" },
  { code: "CH", name: "차암동작은도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

const BASE_URL = "https://kolas.cheonan.go.kr/search/index.php";

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
      listNum: "200",
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
      const jongKeyMatch = href.match(/jongKey=(\d+)/);
      if (jongKeyMatch) {
        const params = new URLSearchParams({
          mod: "wdDataSearch",
          act: "searchResultDetail",
          dbType: "dan",
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
