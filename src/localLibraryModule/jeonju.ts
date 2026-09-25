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

export const moduleName = "전주시립도서관";
export const homeUrl = "https://lib.jeonju.go.kr";

const SEARCH_URL = `${homeUrl}/index.jeonju`;

// 통합도서검색 화면의 메뉴 코드. 빠지면 검색 화면 자체가 렌더링되지 않음
const MENU_CD = "DOM_000000101001001000";

// 표시개수. 100건이 약 5.5초, 200건은 11.5초로 급격히 느려짐
const DISPLAY = 100;

const libraryList: LibraryInfo[] = [
  { code: "JL", name: "전주시립도서관꽃심" },
  { code: "MA", name: "전주시립완산도서관" },
  { code: "ST", name: "전주시립삼천도서관" },
  { code: "WT", name: "전주시립서신도서관" },
  { code: "PH", name: "전주시립평화도서관" },
  { code: "HJ", name: "전주시립효자도서관" },
  { code: "DT", name: "전주시립송천도서관" },
  { code: "GT", name: "전주시립금암도서관" },
  { code: "IT", name: "전주시립인후도서관" },
  { code: "MB", name: "전주시립아중도서관" },
  { code: "JT", name: "전주시립쪽구름도서관" },
  { code: "MC", name: "전주시립건지도서관" },
  { code: "JQ", name: "전주시아중호수도서관" },
  { code: "EC", name: "에코도서관" },
  { code: "HM", name: "혁신복합문화센터작은도서관" },
  { code: "JC", name: "전주시청책기둥도서관" },
  { code: "JA", name: "첫마중길여행자작은도서관" },
  { code: "JP", name: "학산숲속시집작은도서관" },
  { code: "KF", name: "건지산숲속작은도서관" },
  { code: "SG", name: "모롱지작은도서관" },
  { code: "DG", name: "다가여행자도서관" },
  { code: "GB", name: "연화정작은도서관" },
  { code: "00", name: "서학예술마을도서관" },
  { code: "HA", name: "한옥마을도서관" },
  { code: "DM", name: "동문헌책도서관" },
  { code: "FT", name: "옛이야기도서관" },
  { code: "AO", name: "간납대작은도서관" },
  { code: "HD", name: "글마당작은도서관" },
  { code: "KH", name: "금호작은도서관" },
  { code: "DR", name: "꿈드리작은도서관" },
  { code: "JW", name: "꿈밭장애인작은도서관" },
  { code: "DN", name: "꿈이있는나무작은도서관" },
  { code: "NS", name: "노송작은도서관" },
  { code: "DP", name: "덕진품애작은도서관" },
  { code: "MN", name: "맑은누리작은도서관" },
  { code: "MJ", name: "명주골작은도서관" },
  { code: "MS", name: "무지개작은도서관" },
  { code: "JV", name: "봉사자작은도서관" },
  { code: "WD", name: "상상나무작은도서관" },
  { code: "OB", name: "열린점자작은도서관" },
  { code: "VI", name: "인후비전작은도서관" },
  { code: "HC", name: "안골작은도서관" },
  { code: "JJ", name: "전주작은도서관" },
  { code: "SJ", name: "전주책마루어린이작은도서관" },
  { code: "CA", name: "청아나루작은도서관" },
  { code: "NP", name: "초록우산작은도서관" },
  { code: "SO", name: "큰나루작은도서관" },
  { code: "PA", name: "팔복작은도서관" },
  { code: "PO", name: "평화꿈틀작은도서관" },
  { code: "HN", name: "행복나눔작은도서관" },
  { code: "HS", name: "호성작은도서관" },
  { code: "HY", name: "효사랑건강작은도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

/** viewDetail('pageno','reckey','book_type','manage_code') 인자를 뽑는다 */
const VIEW_DETAIL_RE =
  /viewDetail\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*\)/;

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { statusCode, body } = await get(SEARCH_URL, {
    qs: {
      menuCd: MENU_CD,
      book_type: "BOOK",
      search_txt: title,
      manage_code: lcode,
      display: DISPLAY,
      pageno: opt.startPage ?? 1,
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const {
    window: { document },
  } = new JSDOM(body);

  // <p class="bbs_total">전체:총 <strong>8914권(개)</strong></p>
  const totalBookCount = extractNumber(
    document.querySelector("p.bbs_total strong")?.textContent?.replace(/,/g, ""),
  );

  const booklist: Book[] = [];

  document.querySelectorAll("#ul_list > li").forEach((item) => {
    const link = item.querySelector("a[onclick*='viewDetail']");
    const match = link?.getAttribute("onclick")?.match(VIEW_DETAIL_RE);

    if (!match) return;

    // 검색어가 <em>으로 감싸져 들어오므로 textContent로 읽는다
    const bookTitle = link?.querySelector("strong")?.textContent?.trim() ?? "";

    if (!bookTitle) return;

    const [, , reckey, bookType, manageCode] = match;
    const bookUrl =
      `${SEARCH_URL}?menuCd=${MENU_CD}&mode=view` +
      `&reckey=${encodeURIComponent(reckey)}` +
      `&book_type=${encodeURIComponent(bookType)}` +
      `&manage_code=${encodeURIComponent(manageCode)}`;

    const libName =
      item.querySelector("u.c01")?.textContent?.replace(/\s+/g, " ").trim() ??
      libraryName;

    // "대출가능(비치중)" / "대출불가(대출중)" — "도서예약가능"과 섞이지 않도록 전체 문구로 검사
    const exist = item.textContent?.includes("대출가능") ?? false;

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
