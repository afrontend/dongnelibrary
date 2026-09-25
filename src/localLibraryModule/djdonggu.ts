import {
  getLibraryNames as getLibNames,
  createLibraryCodeLookup,
  validateSearchOptions,
  wrapWithCallback,
  extractNumber,
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

export const moduleName = "대전동구공공도서관";
export const homeUrl = "https://www.donggu.go.kr/dg/lib";

const libraryList: LibraryInfo[] = [
  { code: "H0000003", name: "가오도서관" },
  { code: "H0000004", name: "용운도서관" },
  { code: "H0000006", name: "판암도서관" },
  { code: "H0000008", name: "무지개도서관" },
  { code: "H0000009", name: "홍도도서관" },
  { code: "H0000010", name: "자양도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

const SEARCH_URL = "https://lib.donggu.go.kr/dls/index.php";

// 서버가 제공하는 최대 출력 건수는 50 이지만 13초가 걸린다. 20 이 7초로 안전값.
const LIST_NUM = 20;

/**
 * 총 건수는 `<span class="red"> 총 2069권</span>` 로 실려 온다.
 */
function getTotalBookCount(document: Document): number {
  const text =
    document.querySelector(".list_top_left span.red")?.textContent?.replace(
      /,/g,
      "",
    ) ?? "";
  return parseInt(extractNumber(text), 10);
}

/**
 * `<dd>소장처 : <span class="fb black">가오도서관</span> ...</dd>` 에서 소장처를 읽는다.
 * 같은 `dd` 안의 두 번째 `span.fb.black` 은 자료실이라 첫 번째만 쓴다.
 */
function getHoldingLibraryName(item: Element): string {
  for (const dd of item.querySelectorAll("dd")) {
    if (!dd.textContent?.includes("소장처")) continue;
    return dd.querySelector("span.fb.black")?.textContent?.trim() ?? "";
  }
  return "";
}

/**
 * 상세 링크는 검색어까지 물고 있어 자료 키(`ctrl`)만 남긴다.
 */
function getBookUrl(href: string): string {
  const query = href.slice(href.indexOf("?") + 1);
  const ctrl = new URLSearchParams(query).get("ctrl");
  if (!ctrl) return "";
  return `${SEARCH_URL}?mod=wdDataSearch&act=searchResultDetail&ctrl=${ctrl}`;
}

function getBookList(document: Document): Book[] {
  const booklist: Book[] = [];

  document.querySelectorAll("div.best_small > ol > li").forEach((item) => {
    const titleLink = item.querySelector("dt.title a");
    if (!titleLink) return;

    const bookTitle = (titleLink.textContent ?? "").trim();
    if (!bookTitle) return;

    // 소장정보 표(기본 숨김)의 자료상태 칸에 대출 가능 여부가 있다.
    const holdings = item.querySelector("ul.point_box")?.textContent ?? "";

    booklist.push({
      title: bookTitle,
      libraryName: getHoldingLibraryName(item),
      bookUrl: getBookUrl(titleLink.getAttribute("href") ?? ""),
      exist: holdings.includes("대출가능"),
    });
  });

  return booklist;
}

/**
 * Search for books in Daejeon Dong-gu public libraries.
 */
async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, startPage = 1, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { statusCode, body } = await get(SEARCH_URL, {
    qs: {
      mod: "wdDataSearch",
      act: "searchResultList",
      "srchKey[]": "title",
      "srchText[]": title,
      loca: lcode,
      listNum: LIST_NUM,
      page: startPage,
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const { document } = new JSDOM(body).window;

  return {
    startPage,
    totalBookCount: getTotalBookCount(document),
    booklist: getBookList(document),
  };
}

export const search = wrapWithCallback(searchImpl);

export function getLibraryNames(): string[] {
  return getLibNames(libraryList);
}

({ moduleName, homeUrl, search, getLibraryNames }) satisfies LibraryModule;
