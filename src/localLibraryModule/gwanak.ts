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

export const moduleName = "관악구통합도서관";
export const homeUrl = "https://lib.gwanak.go.kr";

const SEARCH_URL =
  "https://lib.gwanak.go.kr/galib/menu/10003/program/30001/searchResultList.do";
const DETAIL_URL =
  "https://lib.gwanak.go.kr/galib/menu/10003/program/30001/searchResultDetail.do";

const libraryList: LibraryInfo[] = [
  { code: "MA", name: "관악중앙도서관" },
  { code: "KJ", name: "글빛정보도서관" },
  { code: "KE", name: "은천동작은도서관" },
  { code: "KW", name: "조원도서관" },
  { code: "G4", name: "고맙습니다하난곡작은도서관" },
  { code: "G3", name: "낙성대공원도서관" },
  { code: "KP", name: "성현동작은도서관" },
  { code: "L5", name: "용꿈꾸는작은도서관" },
  { code: "L3", name: "그림숲그림책작은도서관" },
  { code: "L2", name: "별별창작꿈터 봉현작은도서관" },
  { code: "L4", name: "삼성작은도서관" },
  { code: "M1", name: "굴렁쇠작은도서관" },
  { code: "S7", name: "글사랑작은도서관" },
  { code: "M5", name: "녹두작은도서관" },
  { code: "S4", name: "다사랑작은도서관" },
  { code: "S5", name: "뜰안에작은도서관" },
  { code: "M9", name: "마루작은도서관" },
  { code: "S2", name: "보물섬작은도서관" },
  { code: "N2", name: "새싹작은도서관" },
  { code: "M6", name: "샛별작은도서관" },
  { code: "S8", name: "숯고을작은도서관" },
  { code: "M3", name: "어울작은도서관" },
  { code: "M8", name: "우듬지작은도서관" },
  { code: "S6", name: "우리작은도서관" },
  { code: "M4", name: "울타리작은도서관" },
  { code: "S1", name: "책사랑작은도서관" },
  { code: "M7", name: "책의향기작은도서관" },
  { code: "S9", name: "파랑새작은도서관" },
  { code: "N1", name: "푸른숲작은도서관" },
  { code: "L1", name: "한울작은도서관" },
  { code: "M2", name: "해오름작은도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { statusCode, body } = await get(SEARCH_URL, {
    qs: {
      searchType: "SIMPLE",
      searchCategory: "BOOK",
      searchKey: "TITLE",
      searchKeyword: title,
      searchLibraryArr: lcode,
      searchRecordCount: 300,
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  const strongEl = document.querySelector("strong.themeFC");
  const count = extractNumber(
    strongEl?.textContent?.match(/총\s*([\d,]+)\s*건/)?.[0],
  );

  const booklist: Book[] = [];
  const bookItems = document.querySelectorAll("ul.resultList > li");
  bookItems.forEach((li) => {
    const titleLink = li.querySelector("dl.bookDataWrap dt.tit a");
    const bookTitle = (titleLink?.textContent?.trim() ?? "").replace(
      /^\d+\.\s*/,
      "",
    );

    let bookUrl = "";
    const onclick = titleLink?.getAttribute("onclick") ?? "";
    const urlMatch = onclick.match(
      /fnSearchResultDetail\((\d+),(\d+),'(\w+)'\)/,
    );
    if (urlMatch) {
      const [, recKey, bookKey, publishFormCode] = urlMatch;
      bookUrl = `${DETAIL_URL}?recKey=${recKey}&bookKey=${bookKey}&publishFormCode=${publishFormCode}`;
    }

    const stateEl = li.querySelector("div.bookStateBar p.txt b");
    const exist = stateEl?.textContent?.includes("대출가능") ?? false;

    let libName = "";
    const siteSpan = li.querySelector("dd.site span");
    const siteText = siteSpan?.textContent?.trim() ?? "";
    if (siteText.startsWith("도서관:")) {
      libName = siteText.replace("도서관:", "").trim();
    }

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
