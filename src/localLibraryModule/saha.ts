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

export const moduleName = "사하구도서관";
export const homeUrl = "https://www.saha.go.kr/dadaelib";

const SEARCH_URL = `${homeUrl}/booksearch/list.do`;
const DETAIL_URL = `${homeUrl}/booksearch/view.do`;

// 검색 폼의 메뉴 ID. 빠지면 자료검색 화면이 아닌 다른 메뉴가 렌더링됨
const MENU_ID = "0201000000";

// 표시개수 셀렉트 박스의 최대값. 50건이 약 2초, 100건은 5초
const DISPLAY = 50;

const libraryList: LibraryInfo[] = [
  { code: "BC", name: "다대도서관" },
  { code: "CE", name: "하단도서관" },
  { code: "GS", name: "회화나무작은도서관" },
  { code: "GT", name: "까치마을작은도서관" },
  { code: "GU", name: "괴정3동오작교작은도서관" },
  { code: "GW", name: "당리작은도서관" },
  { code: "GZ", name: "동매누리작은도서관" },
  { code: "HA", name: "꿈꾸는작은도서관" },
  { code: "HB", name: "장림무지개작은도서관" },
  { code: "HC", name: "수풀작은도서관" },
  { code: "HD", name: "두송작은도서관" },
  { code: "HE", name: "낫개작은도서관" },
  { code: "HG", name: "푸른누리작은도서관" },
  { code: "HH", name: "감천횃불작은도서관" },
  { code: "HJ", name: "구평예들작은도서관" },
  { code: "HK", name: "에코작은도서관" },
  { code: "GY", name: "노을나루길작은도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

/** WAF가 검색어를 차단하면 alert 스크립트만 담긴 짧은 HTML을 돌려준다 */
function isBlockedByWaf(body: string): boolean {
  return body.includes("비정상적인 파라메터");
}

/** "소장도서관 : 다대도서관" 처럼 레이블이 붙은 항목에서 값만 뽑는다 */
function findInfoValue(item: Element, label: string): string {
  const text = Array.from(item.querySelectorAll("dd.info > ul > li"))
    .map((li) => li.textContent?.replace(/\s+/g, " ").trim() ?? "")
    .find((line) => line.startsWith(label));

  return text ? text.slice(label.length).replace(/^\s*:\s*/, "").trim() : "";
}

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { statusCode, body } = await get(SEARCH_URL, {
    qs: {
      mId: MENU_ID,
      searchType: "search_title",
      searchTxt: title,
      manage_code: lcode,
      display: DISPLAY,
      page: opt.startPage ?? 1,
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  if (isBlockedByWaf(body)) {
    return { startPage: opt.startPage, totalBookCount: 0, booklist: [] };
  }

  const {
    window: { document },
  } = new JSDOM(body);

  const countText =
    document.querySelector("div.dadaelib-total-search-count")?.textContent ?? "";
  const totalMatch = countText.match(/총\s*([\d,]+)\s*건/);
  const totalBookCount = totalMatch ? extractNumber(totalMatch[1]) : 0;

  const booklist: Book[] = [];

  document
    .querySelectorAll("div.dadaelib-blog.result > ul > li")
    .forEach((item) => {
      const bookTitle = item.querySelector("dt a")?.textContent?.trim() ?? "";

      if (!bookTitle) return;

      const href = item.querySelector("a.more")?.getAttribute("href") ?? "";
      const regNo = href
        ? new URLSearchParams(href.split("?")[1] ?? "").get("reg_no")
        : null;
      const bookUrl = regNo
        ? `${DETAIL_URL}?reg_no=${regNo}&mId=${MENU_ID}`
        : "";

      const libName = findInfoValue(item, "소장도서관") || libraryName;
      const exist = findInfoValue(item, "대출가능여부") === "대출가능";

      booklist.push({ libraryName: libName, title: bookTitle, bookUrl, exist });
    });

  return {
    startPage: opt.startPage,
    totalBookCount,
    booklist,
  };
}

export const search = wrapWithCallback(searchImpl);

export function getLibraryNames(): string[] {
  return getLibNames(libraryList);
}

({ moduleName, homeUrl, search, getLibraryNames }) satisfies LibraryModule;
