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

export const moduleName = "경기광주시도서관";
export const homeUrl = "https://lib.gjcity.go.kr";

const libraryList: LibraryInfo[] = [
  { code: "MA", name: "중앙도서관" },
  { code: "MB", name: "오포도서관" },
  { code: "MH", name: "초월도서관" },
  { code: "MC", name: "곤지암도서관" },
  { code: "MJ", name: "능평도서관" },
  { code: "ML", name: "양벌도서관" },
  { code: "MQ", name: "광남도서관" },
  { code: "MN", name: "퇴촌도서관" },
  { code: "MP", name: "만선도서관" },
  { code: "MR", name: "신현도서관" },
  { code: "MD", name: "대주작은도서관" },
  { code: "MF", name: "퇴촌작은도서관" },
  { code: "MG", name: "도척작은도서관" },
  { code: "MI", name: "광남작은도서관" },
  { code: "MK", name: "남한산성작은도서관" },
  { code: "MS", name: "송정작은도서관" },
  { code: "SL", name: "스마트도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { statusCode, body } = await get(
    "https://lib.gjcity.go.kr:8443/kolaseek/plus/search/plusSearchResultList.do",
    {
      qs: {
        searchType: "SIMPLE",
        searchKey: "ALL",
        searchLibraryArr: lcode,
        searchKeyword: title,
        searchRecordCount: 1000,
      },
      signal,
    },
  );

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  const countEl = document.querySelector("p.rtitle b.themeFC");
  const count = extractNumber(countEl?.textContent);

  const booklist: Book[] = [];
  const bookItems = document.querySelectorAll("ul.resultList > li");
  bookItems.forEach((li) => {
    const titleLink = li.querySelector("dl.bookDataWrap dt.tit a");
    const bookTitle = (titleLink?.textContent?.trim() ?? "").replace(/^\d+\.\s*/, "");

    let bookUrl = "";
    const onclick = titleLink?.getAttribute("onclick") ?? "";
    const urlMatch = onclick.match(/fnSearchResultDetail\((\d+),(\d+),'(\w+)'\)/);
    if (urlMatch) {
      const [, recKey, bookKey, publishFormCode] = urlMatch;
      bookUrl = `https://lib.gjcity.go.kr:8443/kolaseek/plus/search/plusSearchResultDetail.do?recKey=${recKey}&bookKey=${bookKey}&publishFormCode=${publishFormCode}`;
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
