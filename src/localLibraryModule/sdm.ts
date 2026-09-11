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

export const moduleName = "서대문구립도서관";
export const homeUrl = "https://lib.sdm.or.kr";

const SEARCH_URL =
  `${homeUrl}/sdmlib/menu/10003/program/30001/searchResultList.do`;
const DETAIL_URL =
  `${homeUrl}/sdmlib/menu/10003/program/30001/searchResultDetail.do`;

const libraryList: LibraryInfo[] = [
  { code: "MA", name: "서대문구립이진아기념도서관" },
  { code: "MB", name: "새롬어린이도서관" },
  { code: "MC", name: "홍은도담도서관" },
  { code: "MG", name: "해담는도서관" },
  { code: "SA", name: "알음알음작은도서관" },
  { code: "SB", name: "하늘샘작은도서관" },
  { code: "SC", name: "북아현 마을북카페" },
  { code: "SM", name: "늘푸른 열린 작은도서관" },
  { code: "SE", name: "아이누리작은도서관" },
  { code: "SK", name: "파랑새작은도서관" },
  { code: "SP", name: "논골작은도서관" },
  { code: "SF", name: "새싹작은도서관" },
  { code: "SJ", name: "행복작은도서관" },
  { code: "SG", name: "꿈이있는도서관" },
  { code: "SH", name: "문화촌작은도서관" },
  { code: "SI", name: "햇살작은도서관" },
  { code: "SQ", name: "폭포책방아름인도서관" },
  { code: "SS", name: "구청스마트도서관" },
  { code: "MD", name: "아현역스마트도서관" },
  { code: "ME", name: "홍제역스마트도서관" },
  { code: "MF", name: "독립문역스마트도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { statusCode, body } = await get(SEARCH_URL, {
    qs: {
      searchType: "SIMPLE",
      searchKeyword: title,
      searchManageCode: "",
      searchManageCodeArr: lcode,
      searchDisplay: 20,
      currentPageNo: 1,
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  const resultText =
    document.querySelector("div.result_screen")?.textContent ?? "";
  const totalMatch = resultText.match(/총\s*([\d,]+)\s*건/);
  const count = totalMatch ? extractNumber(totalMatch[1]) : 0;

  const booklist: Book[] = [];
  const bookItems = document.querySelectorAll("div.bookArea");
  bookItems.forEach((item) => {
    const titleLink = item.querySelector("div.book_name p.kor.on a");
    const bookTitle = titleLink?.getAttribute("title")?.trim() ?? "";

    let bookUrl = "";
    const onclick = titleLink?.getAttribute("onclick") ?? "";
    const match = onclick.match(
      /fnDetail\('(\d+)',\s*'(\d+)',\s*'([^']*)',\s*'(\w+)'\)/,
    );
    if (match) {
      const [, bookKey, speciesKey, isbn, pubFormCode] = match;
      bookUrl =
        `${DETAIL_URL}?bookKey=${bookKey}&speciesKey=${speciesKey}` +
        `&isbn=${isbn}&pubFormCode=${pubFormCode}`;
    }

    const statusText =
      item.querySelector("div.bookBtnWrap span.status strong")?.textContent ??
      "";

    if (bookTitle) {
      booklist.push({
        libraryName,
        title: bookTitle,
        bookUrl,
        maxoffset: count,
        exist: statusText.includes("대출가능"),
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
