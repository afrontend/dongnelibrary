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

export const moduleName = "군산시도서관";
export const homeUrl = "https://lib.gunsan.go.kr";

const SEARCH_URL = `${homeUrl}/search/include/aggsBookList.do`;
const DETAIL_URL = `${homeUrl}/web/menu/10003/program/30001/searchResultDetail.do`;

const libraryList: LibraryInfo[] = [
  { code: "MA", name: "군산시립도서관" },
  { code: "SB", name: "늘푸른도서관" },
  { code: "SS", name: "설림도서관" },
  { code: "OG", name: "산들도서관" },
  { code: "KG", name: "금강도서관" },
  { code: "BR", name: "임피채만식도서관" },
  { code: "SG", name: "구암작은도서관" },
  { code: "NP", name: "나포작은도서관" },
  { code: "SY", name: "미룡작은도서관" },
  { code: "SM", name: "미성작은도서관" },
  { code: "SW", name: "월명작은도서관" },
  { code: "SN", name: "흥남작은도서관" },
  { code: "SR", name: "나운작은도서관" },
  { code: "SC", name: "산단작은도서관" },
  { code: "TA", name: "서수작은도서관" },
  { code: "SA", name: "성산작은도서관" },
  { code: "SD", name: "중동작은도서관" },
  { code: "SE", name: "개정작은도서관" },
  { code: "HN", name: "회현작은도서관" },
  { code: "TC", name: "노인종합복지관" },
  { code: "TB", name: "평화작은도서관" },
  { code: "TD", name: "수미작은도서관" },
  { code: "GN", name: "그린작은도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);
  const libName = libraryList.find((l) => l.code === lcode)?.name ?? "";

  const { statusCode, body } = await get(SEARCH_URL, {
    qs: {
      searchManageCodeArr: lcode,
      searchKeyword: title,
      searchRecordCount: 50,
      searchPageNo: 1,
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const countMatch = body.match(/\$\('#totalCnt'\)\.text\("([\d,]+)"\)/);
  const count = extractNumber(countMatch?.[1]);

  const dom = new JSDOM(body);
  const document = dom.window.document;

  const booklist: Book[] = [];
  const bookItems = document.querySelectorAll("ul.listWrap > li");
  bookItems.forEach((li) => {
    const nameLink = li.querySelector("a.book_name");

    const titleSpan = nameLink?.querySelector("span.kor");
    const bookTitle = titleSpan?.textContent?.trim() ?? "";

    let bookUrl = "";
    const onclick = nameLink?.getAttribute("onclick") ?? "";
    const urlMatch = onclick.match(
      /fnDetail\('(\d+)',\s*'(\d+)',\s*'([^']+)',\s*'([^']+)'\)/,
    );
    if (urlMatch) {
      const [, bookKey, speciesKey, isbn, pubFormCode] = urlMatch;
      bookUrl = `${DETAIL_URL}?bookKey=${bookKey}&speciesKey=${speciesKey}&isbn=${isbn}&pubFormCode=${pubFormCode}`;
    }

    const statusEl = li.querySelector("div.status p");
    const exist = statusEl?.textContent?.includes("대출가능") ?? false;

    if (bookTitle) {
      booklist.push({ libraryName: libName, title: bookTitle, bookUrl, exist });
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
