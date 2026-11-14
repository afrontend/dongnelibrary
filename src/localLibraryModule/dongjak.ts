import {
  getLibraryNames as getLibNames,
  createLibraryCodeLookup,
  validateSearchOptions,
  wrapWithCallback,
  extractNumber,
} from "../util";
import { get } from "../http";
import { parseHtml } from "../html";
import type {
  Book,
  LibraryInfo,
  LibraryModule,
  SearchOptions,
  SearchResult,
} from "../types";

export const moduleName = "동작구통합도서관";
export const homeUrl = "https://lib.dongjak.go.kr";

const SEARCH_URL = `${homeUrl}/dj/intro/search/index.do`;
const DETAIL_BASE = `${homeUrl}/dj/intro/search/detail.do`;
// 검색·상세 모두 menu_idx 가 있어야 한다. 상세에서 빠지면 제목 없는 메뉴 페이지가 온다.
const MENU_IDX = "111";
const ROW_COUNT = 50;

const libraryList: LibraryInfo[] = [
  { code: "MK", name: "김영삼도서관" },
  { code: "MA", name: "사당솔밭도서관" },
  { code: "MC", name: "동작영어마루도서관" },
  { code: "MD", name: "대방어린이도서관" },
  { code: "MF", name: "약수도서관" },
  { code: "ME", name: "동작샘터도서관" },
  { code: "MH", name: "다울작은도서관" },
  { code: "MJ", name: "국사봉숲속작은도서관" },
  { code: "ML", name: "까망돌도서관" },
  { code: "MN", name: "신대방 누리도서관" },
  { code: "MP", name: "신대방햇살도서관" },
];

// 빈 코드는 0건이 나오므로 도서관을 고르지 않으면 홈의 "전체" 옵션처럼 전체 코드를 넘긴다.
const ALL_CODES = libraryList.map((lib) => lib.code).join(",");

const getLibraryCode = createLibraryCodeLookup(libraryList);

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, startPage = 1, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName) || ALL_CODES;

  const { statusCode, body } = await get(SEARCH_URL, {
    qs: {
      menu_idx: MENU_IDX,
      booktype: "BOOK",
      search_type: "L_TITLE",
      search_text: title,
      libraryCodes: lcode,
      rowCount: ROW_COUNT,
      viewPage: startPage,
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const document = parseHtml(body);

  // `div.search-info b` 는 검색어 하이라이트 <b> 를 먼저 잡으므로 textContent 에서 정규식으로 뽑는다.
  const infoText = document.querySelector("div.search-info")?.textContent ?? "";
  const totalMatch = infoText.match(/총\s*([\d,]+)\s*건/);
  const totalBookCount = totalMatch ? Number(extractNumber(totalMatch[1])) : 0;

  const booklist: Book[] = [];
  const rows = document.querySelectorAll("div#search-results > div.row");

  rows.forEach((row) => {
    const titleLink = row.querySelector("div.bif a.goDetail");
    const bookTitle = titleLink?.textContent?.trim() ?? "";
    if (!titleLink || !bookTitle) return;

    const isbn = titleLink.getAttribute("isbn") ?? "";
    const regNo = titleLink.getAttribute("regNo") ?? "";
    const manageCode = titleLink.getAttribute("manageCode") ?? "";
    // 세트 도서는 isbn 속성에 "9788901239392세트 9788901239408" 처럼 공백·한글이 섞여 온다.
    const bookUrl = regNo
      ? `${DETAIL_BASE}?regNo=${regNo}&isbn=${encodeURIComponent(isbn)}&manageCode=${manageCode}&booktype=BOOK&menu_idx=${MENU_IDX}`
      : "";

    // 표 머리글에 "대출가능여부" 가 있어 행 전체 텍스트로는 항상 참이 된다. 상태 칸만 본다.
    const statusText =
      row.querySelector("table.statusBox tbody td")?.textContent?.trim() ?? "";
    const exist = statusText === "대출가능";

    const libMatch = (row.querySelector("div.bif")?.textContent ?? "").match(
      /소장도서관\s*:\s*([^\n\r]+)/,
    );
    const libName = libMatch?.[1]?.trim() || libraryName;

    booklist.push({ libraryName: libName, title: bookTitle, bookUrl, exist });
  });

  return { startPage, totalBookCount, booklist };
}

export const search = wrapWithCallback(searchImpl);

export function getLibraryNames(): string[] {
  return getLibNames(libraryList);
}

({ moduleName, homeUrl, search, getLibraryNames }) satisfies LibraryModule;
