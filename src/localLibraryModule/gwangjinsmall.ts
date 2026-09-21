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

export const moduleName = "광진구립작은도서관";
export const homeUrl = "https://smalllib.gwangjin.go.kr";

// 메인(/small/)은 jnet 래퍼이고 검색은 /kolaseek/ iframe 이 담당한다
const SEARCH_URL =
  "https://smalllib.gwangjin.go.kr/kolaseek/search/searchResultList.do";
const DETAIL_URL =
  "https://smalllib.gwangjin.go.kr/kolaseek/search/searchDetailView.do";

const libraryList: LibraryInfo[] = [
  { code: "BA", name: "중곡1동작은도서관" },
  { code: "BB", name: "중곡2동작은도서관" },
  { code: "BC", name: "중곡3동작은도서관" },
  { code: "BD", name: "중곡4동작은도서관" },
  { code: "BE", name: "능동작은도서관" },
  { code: "BF", name: "구의1동작은도서관" },
  { code: "BH", name: "광장동작은도서관" },
  { code: "BI", name: "자양1동작은도서관" },
  { code: "BJ", name: "자양2동작은도서관" },
  { code: "BK", name: "자양3동작은도서관" },
  { code: "BL", name: "자양4동작은도서관" },
  { code: "BM", name: "화양동작은도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

// 단건은 1초 안에 오지만 요청이 2개만 겹쳐도 서버가 15~55초 멈춘다(12개 동시 = 전부 30초+).
// 모듈 안에서 요청을 직렬화해 여러 분관 동시 검색도 분관당 1초씩만 걸리게 한다.
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task);
  queue = run.catch(() => {});
  return run;
}

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, startPage = 1, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  // 페이지 크기 파라미터가 없어 10건 고정, currentPageNo 로 페이지 이동
  const { statusCode, body } = await serialize(() =>
    get(SEARCH_URL, {
      qs: {
        searchType: "SIMPLE",
        searchCategory: "BOOK",
        searchKey: "TITLE",
        searchKeyword: title,
        searchLibraryArr: lcode,
        currentPageNo: String(startPage),
      },
      // 순차 요청도 8~12건에 하나꼴로 10~75초 멈추므로 기본 30초보다 길게
      timeout: 60000,
      signal,
    }),
  );

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  // 마크업이 `총 <span class="themeFC">5건</span>` 이라 컨테이너 textContent 에 정규식을 건다
  const htitleEl = document.querySelector("p.htitle.stitle");
  const count = extractNumber(
    htitleEl?.textContent?.match(/총\s*([\d,]+)\s*건/)?.[1],
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
      /fnSearchDetailView\((\d+),(\d+),'(\w+)'\)/,
    );
    if (urlMatch) {
      const [, recKey, bookKey, publishFormCode] = urlMatch;
      bookUrl = `${DETAIL_URL}?recKey=${recKey}&bookKey=${bookKey}&publishFormCode=${publishFormCode}`;
    }

    const stateEl = li.querySelector("div.bookStateBar p.txt b");
    const exist = stateEl?.textContent?.includes("대출가능") ?? false;

    let libName = "";
    const siteSpan = li.querySelector("dd.site span");
    const siteText = siteSpan?.textContent?.trim() ?? "";
    if (siteText.startsWith("도서관:")) {
      libName = siteText.replace("도서관:", "").trim();
    }

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
