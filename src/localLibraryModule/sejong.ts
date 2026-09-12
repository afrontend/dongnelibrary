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

export const moduleName = "세종시립도서관";
export const homeUrl = "https://lib.sejong.go.kr";

const SEARCH_URL = `${homeUrl}/main/site/search/bookSearch.do`;

// yangcheon 과 달리 page_cnt 로 페이지 크기 조정 가능 (rows 는 무시됨)
// 20건 ~2초, 50건 ~5초 → 20이 안전값
const PAGE_SIZE = 20;

const libraryList: LibraryInfo[] = [
  { code: "MS", name: "시립도서관" },
  { code: "MB", name: "도담동도서관" },
  { code: "MC", name: "아름동도서관" },
  { code: "MG", name: "종촌동도서관" },
  { code: "MA", name: "한솔동도서관" },
  { code: "MJ", name: "고운동도서관" },
  { code: "MH", name: "보람동도서관" },
  { code: "MN", name: "대평동도서관" },
  { code: "MO", name: "새롬동도서관" },
  { code: "MP", name: "고운남측도서관" },
  { code: "MQ", name: "소담동도서관" },
  { code: "MR", name: "다정동도서관" },
  { code: "MK", name: "전의면작은도서관" },
  { code: "ML", name: "소정면작은도서관" },
  { code: "ME", name: "장군면작은도서관" },
  { code: "MF", name: "조치원어린이도서관" },
  { code: "MT", name: "해밀동도서관" },
  { code: "MU", name: "반곡동도서관" },
  { code: "MV", name: "연동면작은도서관" },
  { code: "MW", name: "조치원읍도서관" },
  { code: "MX", name: "새롬싱싱도서관" },
  { code: "NA", name: "나성동도서관" },
  { code: "MZ", name: "전의나무도서관" },
  { code: "MY", name: "어진그림책도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, startPage = 1, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { body } = await get(SEARCH_URL, {
    qs: {
      cmd_name: "bookandnonbooksearch",
      manage_code: lcode,
      search_key: "ALL",
      search_txt: title,
      page_cnt: String(PAGE_SIZE),
      page: String(startPage),
    },
    signal,
  });

  // WAF: "javascript" 등 특정 키워드는 608바이트 에러 페이지로 차단됨
  if (body.includes("<title>에러페이지</title>")) {
    return { startPage, totalBookCount: 0, booklist: [] };
  }

  const totalMatch = body.match(/전체 ([\d,]+)<\/span>개가 검색되었습니다/);
  const totalBookCount = totalMatch ? extractNumber(totalMatch[1]) : 0;

  const {
    window: { document },
  } = new JSDOM(body);

  const booklist: Book[] = [];
  const bookDivs = document.querySelectorAll<HTMLElement>("div.book_info");

  for (const div of bookDivs) {
    const bookTitle = div.dataset.ti?.trim() ?? "";
    if (!bookTitle) continue;

    const mgc = div.dataset.mgc ?? lcode;
    const speciesKey = div.dataset.rk ?? "";

    // reckey는 species_key와 다르므로 첫 번째 anchor href에서 추출
    const anchor = div.querySelector<HTMLAnchorElement>("p.tit > a");
    const href = anchor?.getAttribute("href") ?? "";
    let reckey = "";
    if (href.includes("reckey=")) {
      const qs = href.includes("?") ? href.split("?")[1] : href;
      reckey = new URLSearchParams(qs).get("reckey") ?? "";
    }

    const bookUrl =
      speciesKey && reckey
        ? `${SEARCH_URL}?manage_code=${mgc}&book_type=BOOK&book_type_org=&publish_form_code=MO&species_key=${speciesKey}&reckey=${reckey}`
        : "";

    const statusSpan = div.querySelector<HTMLSpanElement>("p.book_status span");
    const exist = statusSpan?.classList.contains("activity") ?? false;

    booklist.push({ libraryName, title: bookTitle, bookUrl, exist });
  }

  return {
    startPage,
    totalBookCount,
    booklist,
  };
}

export const search = wrapWithCallback(searchImpl);

export function getLibraryNames(): string[] {
  return getLibNames(libraryList);
}

({ moduleName, homeUrl, search, getLibraryNames }) satisfies LibraryModule;
