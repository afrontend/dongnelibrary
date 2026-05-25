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

export const moduleName = "중구구립도서관";
export const homeUrl = "https://www.junggulib.or.kr";

const SEARCH_URL =
  `${homeUrl}/SJGL/menu/10003/program/30001/searchResultList.do`;
const DETAIL_URL =
  `${homeUrl}/SJGL/menu/10003/program/30001/searchResultDetail.do`;

const libraryList: LibraryInfo[] = [
  { code: "MF", name: "가온도서관" },
  { code: "MH", name: "어울림도서관" },
  { code: "MD", name: "남산타운 어린이도서관" },
  { code: "ME", name: "손기정 어린이도서관" },
  { code: "MC", name: "신당누리도서관" },
  { code: "MA", name: "다산성곽도서관" },
  { code: "MB", name: "손기정문화도서관" },
  { code: "CA", name: "장충동 작은도서관" },
  { code: "CK", name: "광희동 작은도서관" },
  { code: "CE", name: "다산동 작은도서관" },
  { code: "CI", name: "동화동 작은도서관" },
  { code: "CH", name: "신당5동 작은도서관" },
  { code: "CD", name: "신당동 작은도서관" },
  { code: "CF", name: "약수동 작은도서관" },
  { code: "CL", name: "중구청 작은도서관" },
  { code: "CG", name: "청구동 작은도서관" },
  { code: "CM", name: "필동 작은도서관" },
  { code: "CB", name: "황학동 작은도서관" },
  { code: "CJ", name: "회현동 작은도서관" },
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
      searchManageCodeArr: lcode,
      searchDisplay: 200,
      searchArticle: "SCORE",
      searchOrder: "ASC",
      currentPageNo: 1,
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  const count = extractNumber(
    document.querySelector("#totalCnt")?.textContent ?? "",
  );

  const booklist: Book[] = [];
  const bookItems = document.querySelectorAll("div.bookArea");
  bookItems.forEach((item) => {
    const titleLink = item.querySelector("div.book_name a");
    const bookTitle =
      titleLink?.querySelector("span.kor.on")?.textContent?.trim() ?? "";

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
      item.querySelector("div.book_info.info04 p.emp1")?.textContent ?? "";
    const libName =
      item
        .querySelector("div.book_info.info03 b.themeFC")
        ?.textContent?.replace(/[\[\]]/g, "")
        .trim() ?? libraryName;

    if (bookTitle) {
      booklist.push({
        libraryName: libName,
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
