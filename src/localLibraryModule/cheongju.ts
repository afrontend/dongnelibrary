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

export const moduleName = "청주시립도서관";
export const homeUrl = "https://library.cheongju.go.kr";

const libraryList: LibraryInfo[] = [
  { code: "MA", name: "청주시립도서관" },
  { code: "MN", name: "가로수도서관" },
  { code: "MD", name: "강내도서관" },
  { code: "MM", name: "금빛도서관" },
  { code: "MB", name: "기적의도서관" },
  { code: "SH", name: "내수도서관" },
  { code: "MJ", name: "상당도서관" },
  { code: "MC", name: "서원도서관" },
  { code: "ML", name: "신율봉도서관" },
  { code: "MI", name: "오송도서관" },
  { code: "MG", name: "오창도서관" },
  { code: "ME", name: "오창호수도서관" },
  { code: "MF", name: "옥산도서관" },
  { code: "MH", name: "청원도서관" },
  { code: "MK", name: "흥덕도서관" },
  { code: "SO", name: "성화개신스마트도서관" },
  { code: "SM", name: "농협물류스마트도서관" },
  { code: "SN", name: "흥덕보건소스마트도서관" },
  { code: "AA", name: "자료보존관" },
  { code: "SQ", name: "강서2동스마트도서관" },
  { code: "SP", name: "율봉스마트도서관" },
  { code: "SA", name: "글마루작은도서관" },
  { code: "SC", name: "두꺼비생태작은도서관" },
  { code: "SD", name: "맹꽁이생태작은도서관" },
  { code: "SE", name: "봄눈작은도서관" },
  { code: "SF", name: "봉명작은도서관" },
  { code: "SK", name: "참도깨비작은도서관" },
  { code: "SJ", name: "평생학습관작은도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

const SEARCH_URL = `${homeUrl}/lib/front/index.php`;

// 서버가 허용하는 최대 출력 건수. 100 이상은 오류 페이지를 반환한다.
const DISPLAY = 50;

/**
 * 총 건수는 `총 <span class="blue">36,921권(개)</span>` 로 실려 온다.
 */
function getTotalBookCount(document: Document): number {
  const text =
    document.querySelector(".search_sum .blue")?.textContent?.replace(/,/g, "") ??
    "";
  return parseInt(extractNumber(text), 10);
}

/**
 * `<span class="con"><em>소장기관</em> 청주시립도서관</span>` 처럼
 * 레이블(`<em>`)과 값이 한 요소에 섞여 있어 레이블을 지우고 남은 텍스트를 쓴다.
 */
function getFieldValue(item: Element, label: string): string {
  for (const span of item.querySelectorAll("span.con")) {
    const em = span.querySelector("em");
    if (em?.textContent?.trim() !== label) continue;
    return (span.textContent ?? "").replace(em.textContent ?? "", "").trim();
  }
  return "";
}

/**
 * 제목 링크의 href 는 검색어까지 물고 있어 상세 조회에 필요한 키만 남긴다.
 */
function getBookUrl(href: string): string {
  const params = new URLSearchParams(href.replace(/^\?/, ""));
  const recKey = params.get("recKey");
  const bookKey = params.get("bookKey");
  if (!recKey || !bookKey) return "";
  return `${SEARCH_URL}?g_page=search&m_page=search01&recKey=${recKey}&bookKey=${bookKey}&act=view`;
}

function getBookList(document: Document): Book[] {
  const booklist: Book[] = [];

  document.querySelectorAll(".list_con > dl").forEach((item) => {
    const titleLink = item.querySelector("p.book_name a");
    if (!titleLink) return;

    // `<span class="field">[도서]</span>` 자료유형 배지는 제목이 아니다.
    titleLink.querySelector("span.field")?.remove();
    const bookTitle = (titleLink.textContent ?? "").trim();
    if (!bookTitle) return;

    booklist.push({
      title: bookTitle,
      libraryName: getFieldValue(item, "소장기관"),
      bookUrl: getBookUrl(titleLink.getAttribute("href") ?? ""),
      exist: !!item.querySelector("p.book_condition.use"),
    });
  });

  return booklist;
}

/**
 * Search for books in Cheongju City Libraries.
 */
async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, startPage = 1, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { statusCode, body } = await get(SEARCH_URL, {
    qs: {
      g_page: "search",
      m_page: "search01",
      search_type: "DETAIL",
      search_title: title,
      manage_code_detail: lcode,
      display: DISPLAY,
      pageno: startPage,
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
