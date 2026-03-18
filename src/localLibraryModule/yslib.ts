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

export const moduleName = "여수시립도서관";
export const homeUrl = "https://yslib.yeosu.go.kr";

const libraryList: LibraryInfo[] = [
  { code: "MG", name: "여수이순신도서관" },
  { code: "MA", name: "여수시립쌍봉도서관" },
  { code: "MB", name: "여수시립현암도서관" },
  { code: "MC", name: "여수시립환경도서관" },
  { code: "MD", name: "여수시립돌산도서관" },
  { code: "ME", name: "여수시립소라도서관" },
  { code: "MF", name: "여수시립율촌도서관" },
  { code: "PA", name: "거문도은빛바다도서관" },
  { code: "PB", name: "치매안심센터작은도서관" },
  { code: "PC", name: "청솔글누리작은도서관" },
  { code: "PD", name: "동부도시보건작은도서관" },
  { code: "PE", name: "화양열린작은도서관" },
  { code: "PF", name: "여문늘벗작은도서관" },
  { code: "PH", name: "국동작은도서관" },
  { code: "SA", name: "아주타운아파트작은도서관" },
  { code: "SB", name: "책이랑나랑작은도서관" },
  { code: "SC", name: "현천작은도서관" },
  { code: "SE", name: "꿈꾸는영어전문작은도서관" },
  { code: "SF", name: "학마을작은도서관" },
  { code: "SG", name: "웅천지웰작은도서관" },
  { code: "SH", name: "한려작은도서관" },
  { code: "SJ", name: "주은금호작은도서관" },
  { code: "SK", name: "광림작은도서관" },
  { code: "SM", name: "민들레작은도서관" },
  { code: "SO", name: "원앙작은도서관" },
  { code: "SP", name: "푸른정원작은도서관" },
  { code: "SR", name: "로얄골드빌작은도서관" },
  { code: "SS", name: "꿈을키우는작은도서관" },
  { code: "SY", name: "신기부영작은도서관" },
  { code: "SZ", name: "국동365열린도서관" },
  { code: "TA", name: "지웰2차 작은도서관" },
  { code: "TB", name: "이편한 작은도서관" },
  { code: "TC", name: "채움늘 작은도서관" },
  { code: "TD", name: "웅천글꽃 작은도서관" },
  { code: "TE", name: "포레나여수웅천더테라스작은도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

const BASE_URL = "https://yslib.yeosu.go.kr/dls_kapi/index.php";

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { statusCode, body } = await get(BASE_URL, {
    qs: {
      mod: "wdDataSearch",
      act: "searchResultList",
      cn: "booksearch",
      searchItem: "allitem",
      searchWord: title,
      facetManageCode: lcode,
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  // Extract total count from "총 <strong>14권(개)</strong>"
  const countStrong = document.querySelector("h3 > strong");
  const count = extractNumber(countStrong?.textContent);

  const booklist: Book[] = [];
  const bookItems = document.querySelectorAll("dl");
  bookItems.forEach((dl) => {
    // Get title from dd > div > a (the title link with manageCode)
    const titleLink = dl.querySelector("dd > div > a");
    const bookTitle = titleLink?.textContent?.trim() ?? "";

    // Get book URL from dt > a href
    let bookUrl = "";
    const dtLink = dl.querySelector("dt > a");
    const href = dtLink?.getAttribute("href") ?? "";
    if (href) {
      const path = href.startsWith("./") ? href.slice(1) : href;
      bookUrl = `https://yslib.yeosu.go.kr/dls_kapi${path}`;
    }

    // Get availability from ul > li > strong text
    const statusEl = dl.querySelector("ul > li > strong");
    const statusText = statusEl?.textContent?.trim() ?? "";
    const exist = statusText.includes("대출가능");

    // Get library name from list items containing "소장기관"
    let libName = "";
    const listItems = dl.querySelectorAll("dd li");
    listItems.forEach((li) => {
      const strongs = li.querySelectorAll("strong");
      strongs.forEach((strong) => {
        if (strong.textContent?.trim() === "소장기관") {
          const nextText = strong.nextSibling?.textContent?.trim() ?? "";
          if (nextText) {
            libName = nextText;
          }
        }
      });
    });

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
