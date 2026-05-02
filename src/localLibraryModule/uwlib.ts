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

export const moduleName = "의왕시도서관";
export const homeUrl = "https://uwlib.or.kr";

const libraryList: LibraryInfo[] = [
  { code: "MA", name: "중앙도서관" },
  { code: "MB", name: "내손도서관" },
  { code: "MC", name: "글로벌도서관" },
  { code: "MD", name: "오전빛고운도서관" },
  { code: "ME", name: "부곡글고운도서관" },
  { code: "MF", name: "내손책고운도서관" },
  { code: "MG", name: "청계참고운도서관" },
  { code: "MH", name: "청계숲고운도서관" },
  { code: "MJ", name: "포일어울림도서관" },
  { code: "MK", name: "백운호수도서관" },
  { code: "ML", name: "왕송호수작은도서관" },
  { code: "MM", name: "의왕시이동도서관" },
  { code: "NA", name: "글누리작은도서관" },
  { code: "NB", name: "행복작은도서관" },
  { code: "NC", name: "더샵캐슬작은도서관" },
  { code: "ND", name: "백합작은도서관" },
  { code: "NE", name: "대명구름채작은도서관" },
  { code: "NF", name: "이음작은도서관" },
  { code: "NG", name: "사통이네작은도서관" },
  { code: "NH", name: "숲속옹달샘작은도서관" },
  { code: "NI", name: "라포레푸른작은도서관" },
  { code: "NJ", name: "초평엘리프작은도서관" },
  { code: "NK", name: "진달래아파트작은도서관" },
  { code: "A34", name: "의왕역스마트도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { statusCode, body } = await get(
    `https://uwlib.or.kr/jungang/program/searchResultList.do`,
    {
      qs: {
        searchType: "SIMPLE",
        searchCategory: "ALL",
        searchField: "TITLE",
        searchPbLibraryArr: lcode,
        searchWord: title,
        searchRecordCount: 10,
      },
      signal,
    },
  );

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  // Count is in the second .highlight element (first is the search term)
  const highlightElems = document.querySelectorAll(".highlight");
  const count = extractNumber(highlightElems[1]?.textContent);

  const booklist: Book[] = [];
  const bookItems = document.querySelectorAll(".listWrap li .bookArea");
  bookItems.forEach((item) => {
    const titleLink = item.querySelector(".book_name a");
    // Title is in the <span> inside the link (may contain nested <span class="highlight">)
    const titleSpan = titleLink?.querySelector("span");
    const bookTitle = titleSpan?.textContent?.trim() ?? "";

    const onclick = titleLink?.getAttribute("onclick") ?? "";
    // fnSearchResultDetail(speciesKey, bookKey, 'publishFormCode')
    const match = onclick.match(/fnSearchResultDetail\((\d+),\s*(\d+),\s*'(\w+)'\)/);
    let bookUrl = "";
    if (match) {
      const [, speciesKey, bookKey, publishFormCode] = match;
      bookUrl = `https://uwlib.or.kr/jungang/program/searchResultDetail.do?speciesKey=${speciesKey}&bookKey=${bookKey}&publishFormCode=${publishFormCode}`;
    }

    const statusText = item.querySelector(".status p")?.textContent?.trim() ?? "";
    const libName = item.querySelector(".info03 strong")?.textContent?.trim() ?? "";

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
