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

export const moduleName = "마포구립도서관";
export const homeUrl = "https://mplib.mapo.go.kr";

const SEARCH_URL =
  "https://mplib.mapo.go.kr/mcl/PGM3007/plusSearchResultList.do";
const DETAIL_URL =
  "https://mplib.mapo.go.kr/mcl/MENU1039/PGM3007/plusSearchDetailView.do";

const libraryList: LibraryInfo[] = [
  { code: "HQ", name: "마포중앙도서관" },
  { code: "MN", name: "소금나루도서관" },
  { code: "MA", name: "마포구립서강도서관" },
  { code: "HK", name: "마포푸르메어린이도서관" },
  { code: "DO", name: "마포나루스페이스" },
  { code: "MK", name: "마포어린이영어도서관" },
  { code: "ML", name: "마포꿈나래어린이영어도서관" },
  { code: "MI", name: "고맙습니다 성산글마루 작은도서관" },
  { code: "ME", name: "꿈을이루는 작은도서관" },
  { code: "MF", name: "늘푸른소나무 작은도서관" },
  { code: "MC", name: "복사골 작은도서관" },
  { code: "MG", name: "성메 작은도서관" },
  { code: "MH", name: "아름드리 작은도서관" },
  { code: "MJ", name: "용강동 작은도서관" },
  { code: "MM", name: "마포초록숲작은도서관" },
  { code: "MB", name: "해오름 작은도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, startPage = 1, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { statusCode, body } = await get(SEARCH_URL, {
    qs: {
      searchType: "SIMPLE",
      searchCategory: "BOOK",
      searchKey: "TITLE",
      searchKeyword: title,
      searchLibraryArr: lcode,
      searchRecordCount: "10",
      currentPageNo: String(startPage),
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  // "총 <span class="themeFC">541건</span>" 처럼 총 건수가 span 밖에 걸쳐 있어
  // p.rtitle 전체 textContent 로 매칭한다 (첫 span 은 "자료 검색 결과" 라 무관)
  const countEl = document.querySelector("p.rtitle");
  const count = extractNumber(
    countEl?.textContent?.match(/총\s*([\d,]+)\s*건/)?.[1],
  );

  const booklist: Book[] = [];
  const bookItems = document.querySelectorAll("ul.resultList > li");
  bookItems.forEach((li) => {
    const titleLink = li.querySelector("dl.bookDataWrap dt.tit a");
    const bookTitle = titleLink?.textContent?.trim() ?? "";

    let bookUrl = "";
    const onclick = titleLink?.getAttribute("onclick") ?? "";
    const urlMatch = onclick.match(
      /fnSearchDetailView\((\d+),(\d+),'(\w+)'\)/,
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
