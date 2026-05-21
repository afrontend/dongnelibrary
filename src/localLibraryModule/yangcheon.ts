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

export const moduleName = "양천구도서관";
export const homeUrl = "https://lib.yangcheon.or.kr";

const SEARCH_URL = `${homeUrl}/main/site/search/bookSearch.do`;

// 페이지 크기 고정 (rows 파라미터와 무관하게 서버가 항상 10건 반환)
const PAGE_SIZE = 10;

const libraryList: LibraryInfo[] = [
  { code: "MA", name: "갈산도서관" },
  { code: "MB", name: "목마교육도서관" },
  { code: "MC", name: "방아다리문학도서관" },
  { code: "MD", name: "신월음악도서관" },
  { code: "ME", name: "영어특성화도서관" },
  { code: "MF", name: "해맞이역사도서관" },
  { code: "MG", name: "개울건강도서관" },
  { code: "SG", name: "미감도서관" },
  { code: "MH", name: "양천중앙도서관" },
  { code: "SA", name: "고운달작은도서관" },
  { code: "SB", name: "고운맘작은도서관" },
  { code: "SC", name: "신월3북카페(달빛마을책쉼터)" },
  { code: "SD", name: "목3북카페" },
  { code: "SF", name: "목2북카페" },
  { code: "SH", name: "신정3북카페" },
  { code: "SK", name: "그린나래미술도서관" },
  { code: "SM", name: "모새미작은도서관" },
  { code: "UA", name: "목1동 도서방" },
  { code: "UB", name: "새아름 작은도서관" },
  { code: "UD", name: "신정6동 도서방" },
  { code: "UE", name: "신정7동 도서방" },
  { code: "FA", name: "스마트도서관" },
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
      rows: String(PAGE_SIZE),
      page: String(startPage),
    },
    signal,
  });

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
