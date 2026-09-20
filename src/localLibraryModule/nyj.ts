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

export const moduleName = "남양주시도서관";
export const homeUrl = "https://lib.nyj.go.kr";

const SEARCH_URL = "https://lib.nyj.go.kr/jyy/plusSearchResultList.do";
const DETAIL_URL =
  "https://lib.nyj.go.kr/jyy/menu/10070/program/30017/plusSearchResultDetail.do";

const libraryList: LibraryInfo[] = [
  { code: "141035", name: "정약용도서관" },
  { code: "141146", name: "와부도서관" },
  { code: "141521", name: "진접도서관" },
  { code: "141536", name: "진접푸른숲도서관" },
  { code: "141071", name: "화도도서관" },
  { code: "141625", name: "이석영뉴미디어도서관" },
  { code: "141176", name: "오남도서관" },
  { code: "141091", name: "진건도서관" },
  { code: "141137", name: "별내도서관" },
  { code: "141401", name: "퇴계원도서관" },
  { code: "141585", name: "호평도서관" },
  { code: "141175", name: "평내도서관" },
  { code: "141568", name: "별빛도서관" },
  { code: "141153", name: "조안씨앗작은도서관" },
  { code: "141159", name: "금곡푸른꿈작은도서관" },
  { code: "141240", name: "수동작은도서관" },
  { code: "141265", name: "호평작은도서관" },
  { code: "999001", name: "덕소역스마트도서관" },
  { code: "999002", name: "시청스마트도서관" },
  { code: "999003", name: "다산역스마트도서관" },
  // 999004 평내호평역스마트도서관 — 검색 폼에는 있으나 어떤 검색어에도 0건이라 제외
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, startPage = 1, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  // 서버가 느려 searchRecordCount 50↑ 은 20~90초까지 흔들리고 간헐적으로
  // 연결이 리셋된다. 20건(1~5초) + currentPageNo 페이지네이션으로 고정
  const { statusCode, body } = await get(SEARCH_URL, {
    qs: {
      searchType: "SIMPLE",
      searchCategory: "BOOK",
      searchKey: "TITLE",
      searchKeyword: title,
      searchLibraryArr: lcode,
      searchRecordCount: "20",
      currentPageNo: String(startPage),
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  // "총 <span class="themeFC">463건</span>" — 숫자만 span 안에 있어
  // p.rtitle 전체 textContent 로 매칭한다
  const countEl = document.querySelector("p.rtitle");
  const count = extractNumber(
    countEl?.textContent?.match(/총\s*([\d,]+)\s*건/)?.[1],
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

    // "소장도서관: 정약용도서관" — 다른 galib 변형의 "도서관:" 과 접두사가 다르다
    const siteSpan = li.querySelector("dd.site span");
    const siteText = siteSpan?.textContent?.trim() ?? "";
    const libName = siteText.replace(/^소장도서관:\s*/, "").trim();

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
