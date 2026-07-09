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

export const moduleName = "성북구립도서관";
export const homeUrl = "https://sblib.seoul.kr";

const SEARCH_URL =
  "https://www.sblib.seoul.kr/library/menu/10012/program/30003/searchResultList.do";
const DETAIL_URL =
  "https://www.sblib.seoul.kr/library/menu/10012/program/30003/searchResultDetail.do";

const libraryList: LibraryInfo[] = [
  { code: "BR", name: "성북정보" },
  { code: "MA", name: "아리랑" },
  { code: "BT", name: "해오름" },
  { code: "TR", name: "새날" },
  { code: "ME", name: "꿈마루" },
  { code: "MF", name: "미리내" },
  { code: "MI", name: "달빛마루" },
  { code: "MG", name: "정릉" },
  { code: "MJ", name: "청수" },
  { code: "MK", name: "월곡꿈그림" },
  { code: "ML", name: "아리랑어린이" },
  { code: "MM", name: "장위행복누림" },
  { code: "MN", name: "성북길빛" },
  { code: "MO", name: "글빛" },
  { code: "MZ", name: "오동숲속" },
  { code: "BA", name: "보문숲길" },
  { code: "MP", name: "어린이청소년" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { statusCode, body } = await get(SEARCH_URL, {
    qs: {
      query: title,
      realQuery: title,
      reQuery: "2",
      f1: "ALL",
      searchField: "ALL",
      collection: "book",
      resultCount: 50,
      categoryManageCode: lcode,
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  const tabEl = document.querySelector("#ttab3 li.choiced a");
  const count = extractNumber(
    tabEl?.textContent?.match(/단행본\(([\d,]+)\)/)?.[1],
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
      /fnSearchDetailView\('(\d+)','(\d+)','(\w+)'\)/,
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
