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

export const moduleName = "울주군통합도서관";
export const homeUrl = "https://uljulib.ulju.ulsan.kr";

const libraryList: LibraryInfo[] = [
  // MA 옹기종기는 소장이 적어 (javascript 0건) 가장 큰 선바위를 첫 번째로 둔다
  { code: "BM", name: "울주선바위도서관" },
  { code: "MA", name: "울주옹기종기도서관" },
  { code: "BS", name: "울주천상도서관" },
  { code: "BN", name: "온산도서관" },
  { code: "BK", name: "삼동느티나무도서관" },
  { code: "BQ", name: "온양BOOKCAFE" },
  { code: "BD", name: "청량늘푸름작은도서관" },
  { code: "BE", name: "서생해오름작은도서관" },
  { code: "BH", name: "상북가지산작은도서관" },
  { code: "BJ", name: "웅촌작은도서관" },
  { code: "BO", name: "언양읍성작은도서관" },
  { code: "BP", name: "작천정작은도서관" },
  { code: "BR", name: "책마을작은도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

// 홈(uljulib.ulju.ulsan.kr)은 eGov CMS 래퍼이고 실제 검색은 별도 도메인의 dls_lt 를 iframe 으로 띄운다
const BASE_URL = "https://searchlib.ulju.ulsan.kr/dls_lt/index.php";
const PAGE_SIZE = 20;

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, startPage, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { statusCode, body } = await get(BASE_URL, {
    qs: {
      mod: "wdDataSearch",
      act: "searchResultList",
      "searchItem[]": "title",
      "searchWord[]": title,
      manageCode: lcode,
      listNum: String(PAGE_SIZE),
      page: String(startPage),
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
    // JS 가 채우는 템플릿 <dl> (id="aTitle") 은 건너뛴다
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

    const statusText =
      dl.querySelector("div.statu span.using")?.textContent?.trim() ?? "";
    const exist = statusText.includes("대출가능");

    const libName =
      dl.querySelector("span.con > span.blue")?.textContent?.trim() ?? "";

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
    startPage,
    totalBookCount: count,
    booklist,
  };
}

export const search = wrapWithCallback(searchImpl);

export function getLibraryNames(): string[] {
  return getLibNames(libraryList);
}

({ moduleName, homeUrl, search, getLibraryNames }) satisfies LibraryModule;
