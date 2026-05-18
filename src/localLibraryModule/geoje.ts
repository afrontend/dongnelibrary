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

export const moduleName = "거제시도서관";
export const homeUrl = "https://lib.geoje.go.kr";

const WKCMS_BASE = "https://lib.geoje.go.kr:9080/wkcms";

const libraryList: LibraryInfo[] = [
  { code: "MA", name: "거제시립장평도서관" },
  { code: "MC", name: "거제시립장승포도서관" },
  { code: "MD", name: "거제시립수양도서관" },
  { code: "ME", name: "거제시립하청도서관" },
  { code: "MF", name: "거제시립아주도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  // JSESSIONID cookie required — init session before searching
  const session = createSession();
  await session.get(`${WKCMS_BASE}/KBookSearch/BookSearchPage/MA`, { signal });

  const params = new URLSearchParams({
    search_txt: title,
    book_type: "BOOK",
    pageno: String(opt.startPage ?? 1),
    display: "20",
    detail_search_type: "Nomal",
    manage_code: lcode,
    option: "nomal",
    libcode: "ALL",
    input_search_text: title,
    real_search_text: title,
    now_search_txt: title,
    hidden_book_type: "BOOK",
    orderby: "ASC",
    orderby_item: "TITLE_INFO_SORT",
  });

  const { statusCode, body } = await session.get(
    `${WKCMS_BASE}/KBookSearch/BookNomalSearch/MA?${params}`,
    { signal },
  );

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  const h3Text =
    document.querySelector("div#content h3")?.textContent ?? "";
  const totalMatch = h3Text.match(/총\s*([\d,]+)\s*건/);
  const totalBookCount = totalMatch ? extractNumber(totalMatch[1]) : 0;

  const booklist: Book[] = [];
  document.querySelectorAll("ul.book_info > li").forEach((li) => {
    const bookTitle = li.querySelector("h4")?.textContent?.trim() ?? "";
    const exist = li.querySelector("td.loan_o") !== null;
    const libName =
      li.querySelector('input[id^="LIB_NAME"]')?.getAttribute("value") ?? "";
    const recKey =
      li.querySelector('input[id^="REC_KEY"]')?.getAttribute("value") ?? "";
    const bookUrl = recKey
      ? `${WKCMS_BASE}/BookSearch/bookPrintPopup?rec_key=${recKey}&manage_code=${lcode}&book_type=BOOK`
      : "";

    if (bookTitle) {
      booklist.push({ libraryName: libName, title: bookTitle, bookUrl, exist });
    }
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
