import {
  getLibraryNames as getLibNames,
  createLibraryCodeLookup,
  validateSearchOptions,
  extractNumber,
  wrapWithCallback,
} from "../util";
import { createSession } from "../http";
import { JSDOM } from "jsdom";
import type {
  Book,
  LibraryInfo,
  LibraryModule,
  SearchOptions,
  SearchResult,
} from "../types";

export const moduleName = "유성구통합도서관";
export const homeUrl = "https://lib.yuseong.go.kr";

const SEARCH_FORM_URL = `${homeUrl}/web/menu/10075/program/30005/searchSimple.do`;
const SEARCH_URL = `${homeUrl}/web/menu/10075/program/30005/searchResultList.do`;
const DETAIL_URL = `${homeUrl}/web/program/searchResultDetail.do`;

// 표시개수 셀렉트 박스의 최대값. 50건이 약 2초, 100건은 3.4초
const RECORD_COUNT_PER_PAGE = 50;

const libraryList: LibraryInfo[] = [
  { code: "H0000015", name: "노은도서관" },
  { code: "H0000016", name: "유성도서관" },
  { code: "H0000018", name: "진잠도서관" },
  { code: "H0000019", name: "구즉도서관" },
  { code: "H0000020", name: "구암도서관" },
  { code: "H0000026", name: "원신흥도서관" },
  { code: "H0000028", name: "아가랑도서관" },
  { code: "H0000030", name: "관평도서관" },
  { code: "H0000031", name: "전민도서관" },
  { code: "H0000013", name: "유성엑스포도서관" },
  { code: "H0000033", name: "용산도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  // JSESSIONID 쿠키와 폼의 csrfToken이 모두 있어야 검색됨 (없으면 302)
  const session = createSession();
  const { body: formBody } = await session.get(SEARCH_FORM_URL, { signal });
  const csrfToken = formBody.match(/name="csrfToken" value="([^"]+)"/)?.[1] ?? "";

  const { statusCode, body } = await session.post(SEARCH_URL, {
    form: {
      csrfToken,
      searchType: "SIMPLE",
      vSrchKey: "0",
      vSrchText: title,
      vLmt2: lcode,
      currentPageNo: String(opt.startPage ?? 1),
      recordCountPerPage: String(RECORD_COUNT_PER_PAGE),
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const totalMatch = body.match(
    /검색결과\s*총\s*<strong class="highlight">([\d,]+)<\/strong>\s*건/,
  );
  const totalBookCount = totalMatch ? extractNumber(totalMatch[1]) : 0;

  const {
    window: { document },
  } = new JSDOM(body);

  const booklist: Book[] = [];

  document.querySelectorAll("div.book-item").forEach((item) => {
    const nameEl = item.querySelector("a.bookName");
    // "단행본" 같은 자료유형 배지는 제목이 아니므로 제거
    nameEl?.querySelector("b.bookKind")?.remove();
    const bookTitle = nameEl?.textContent?.trim() ?? "";

    if (!bookTitle) return;

    const vCtrl =
      item.querySelector('input[name="ctrlno"]')?.getAttribute("value") ?? "";
    const bookUrl = vCtrl ? `${DETAIL_URL}?vCtrl=${vCtrl}` : "";

    const holdingText = Array.from(item.querySelectorAll("div.barList p"))
      .map((p) => p.textContent?.trim() ?? "")
      .find((text) => text.startsWith("소장처"));
    const libName = holdingText
      ? holdingText.replace(/^소장처\s*:\s*/, "").trim()
      : libraryName;

    const exist =
      item.querySelector("div.bookStatus p")?.textContent?.trim() ===
      "대출가능";

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
