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

export const moduleName = "대구광역시통합도서관";
export const homeUrl = "https://library.daegu.go.kr";

const SEARCH_URL =
  "https://library.daegu.go.kr/dgulib/intro/search/indexAll.do";

const libraryList: LibraryInfo[] = [
  { code: "DG", name: "대구도서관" },
  { code: "AA", name: "대구2ㆍ28기념학생도서관" },
  { code: "AL", name: "대구2ㆍ28민주운동기념회관" },
  { code: "HU", name: "대구혁신도시 복합문화센터" },
  { code: "AG", name: "대구광역시립 남부도서관" },
  { code: "AJ", name: "대구광역시립 달성도서관" },
  { code: "AB", name: "대구광역시립 두류도서관" },
  { code: "AC", name: "대구광역시립 북부도서관" },
  { code: "AF", name: "대구광역시립 서부도서관" },
  { code: "AE", name: "대구광역시립 수성도서관" },
  { code: "AD", name: "국채보상운동기념도서관" },
  { code: "AM", name: "대구광역시교육청 삼국유사군위도서관" },
  { code: "FV", name: "시청작은도서관" },
  { code: "AH", name: "대구광역시립 동부도서관" },
  { code: "HX", name: "와글와글아이세상 어린이도서관" },
  { code: "CA", name: "안심도서관" },
  { code: "CB", name: "신천도서관" },
  { code: "BL", name: "서구어린이도서관" },
  { code: "BQ", name: "비산도서관" },
  { code: "BP", name: "서구영어도서관" },
  { code: "BM", name: "비원도서관" },
  { code: "BN", name: "원고개도서관" },
  { code: "BT", name: "이천어울림도서관" },
  { code: "BS", name: "대명어울림도서관" },
  { code: "BA", name: "구수산도서관" },
  { code: "BB", name: "대현도서관" },
  { code: "BC", name: "태전도서관" },
  { code: "HW", name: "서변숲도서관" },
  { code: "FS", name: "대구중구영어도서관" },
  { code: "BD", name: "범어도서관" },
  { code: "BE", name: "용학도서관" },
  { code: "BF", name: "고산도서관" },
  { code: "BG", name: "파동도서관" },
  { code: "BH", name: "무학숲도서관" },
  { code: "BJ", name: "책숲길도서관" },
  { code: "BK", name: "물망이도서관" },
  { code: "HR", name: "황금책문화센터" },
  { code: "HS", name: "수성못그림책도서관" },
  { code: "BU", name: "성서도서관" },
  { code: "BV", name: "달서어린이도서관" },
  { code: "BW", name: "도원도서관" },
  { code: "BX", name: "본리도서관" },
  { code: "BY", name: "달서가족문화도서관" },
  { code: "BZ", name: "달서영어도서관" },
  { code: "BR", name: "달성군립도서관" },
  { code: "CD", name: "달성어린이숲도서관" },
  { code: "CC", name: "New평리도서관" },
  { code: "HT", name: "서구어린이영어도서관" },
  { code: "HY", name: "내당도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { statusCode, body } = await get(SEARCH_URL, {
    qs: {
      menu_idx: 7,
      booktype: "BOOKANDNONBOOK",
      libraryCodes: lcode,
      title,
      rowCount: 40,
      viewPage: opt.startPage ?? 1,
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  // WAF가 "javascript" 등 특정 키워드를 차단하면 alert()만 있는 95바이트 HTML 반환
  if (body.includes("보안상 잘못된 요청이 발생했습니다")) {
    return { startPage: opt.startPage, totalBookCount: 0, booklist: [] };
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  const countEl = document.querySelector("div.search-info b");
  const totalBookCount = extractNumber(countEl?.textContent ?? "0");

  const booklist: Book[] = [];
  const rows = document.querySelectorAll(
    "div#search-results div.imageType div.row",
  );

  rows.forEach((row) => {
    const bif = row.querySelector("div.bif");
    if (!bif) return;

    const titleLink = bif.querySelector("a[href*='detail.do']");
    const titleSpan = titleLink?.querySelector("span");
    const bookTitle = titleSpan?.textContent?.trim() ?? "";
    if (!bookTitle) return;

    const relHref = titleLink?.getAttribute("href") ?? "";
    const bookUrl = relHref
      ? `https://library.daegu.go.kr/dgulib/intro/search/${relHref}`
      : "";

    let exist = false;
    let libName = "";

    const paragraphs = Array.from(bif.querySelectorAll("p"));
    for (const p of paragraphs) {
      const text = p.textContent ?? "";
      if (text.includes("대출가능여부")) {
        // "대출가능여부 : 대출가능" → exist=true, "대출중" etc → exist=false
        const afterColon = text.split(":").slice(1).join(":").trim();
        exist = afterColon.startsWith("대출가능");
      }
      if (text.includes("소장도서관")) {
        const spans = p.querySelectorAll("span");
        if (spans.length > 0) libName = spans[0].textContent?.trim() ?? "";
      }
    }

    booklist.push({ libraryName: libName, title: bookTitle, bookUrl, exist });
  });

  return { startPage: opt.startPage, totalBookCount, booklist };
}

export const search = wrapWithCallback(searchImpl);

export function getLibraryNames(): string[] {
  return getLibNames(libraryList);
}

({ moduleName, homeUrl, search, getLibraryNames }) satisfies LibraryModule;
