import {
  getLibraryNames as getLibNames,
  createLibraryCodeLookup,
  validateSearchOptions,
  wrapWithCallback,
} from "../util";
import { post } from "../http";
import { JSDOM } from "jsdom";
import type {
  Book,
  LibraryInfo,
  LibraryModule,
  SearchOptions,
  SearchResult,
} from "../types";

export const moduleName = "전북교육청도서관";
export const homeUrl = "https://lib.jbe.go.kr";

const libraryList: LibraryInfo[] = [
  { code: "lib_MA", name: "전주학생교육문화관" },
  { code: "lib_MB", name: "군산학생교육문화관" },
  { code: "lib_MC", name: "군산학생교육문화관(대야분관)" },
  { code: "lib_MD", name: "익산학생교육문화관" },
  { code: "lib_ME", name: "익산학생교육문화관(함열분관)" },
  { code: "lib_MF", name: "남원학생교육문화관" },
  { code: "lib_MG", name: "남원학생교육문화관(운봉분관)" },
  { code: "lib_MH", name: "김제학생교육문화관" },
  { code: "lib_MJ", name: "김제학생교육문화관(금산분관)" },
  { code: "lib_MK", name: "부안학생교육문화관" },
  { code: "lib_MN", name: "정읍학생복지회관" },
  { code: "lib_MP", name: "완주도서관" },
  { code: "lib_MQ", name: "진안도서관" },
  { code: "lib_MR", name: "무주도서관" },
  { code: "lib_MS", name: "장수도서관" },
  { code: "lib_MT", name: "임실도서관" },
  { code: "lib_MU", name: "순창도서관" },
  { code: "lib_MV", name: "고창도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

const SEARCH_URL = `${homeUrl}/jbe/intro/search/index.do`;
const DETAIL_URL = `${homeUrl}/jbe/intro/search/detail.do`;
const ROW_COUNT = 20;

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, startPage = 1, signal } = opt;

  validateSearchOptions(opt);

  const libCode = getLibraryCode(libraryName);

  const { statusCode, body } = await post(SEARCH_URL, {
    form: {
      menu_idx: "9",
      search_type: "L_TITLE",
      booktype: "BOOK",
      search_text: title,
      libraryCodes: libCode,
      viewPage: String(startPage),
      rowCount: String(ROW_COUNT),
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const {
    window: { document },
  } = new JSDOM(body);

  const pageButtons = document.querySelectorAll<HTMLAnchorElement>(
    "a.paginate_button",
  );
  let lastPage = 1;
  pageButtons.forEach((btn) => {
    const kv = parseInt(btn.getAttribute("keyValue") ?? "0", 10);
    if (kv > lastPage) lastPage = kv;
  });
  const totalBookCount = lastPage * ROW_COUNT;

  const booklist: Book[] = [];
  const rows = document.querySelectorAll<HTMLElement>(
    "#search-results .row",
  );

  rows.forEach((row) => {
    const titleLink = row.querySelector<HTMLAnchorElement>("a.name.goDetail");
    if (!titleLink) return;

    const titleSpan = titleLink.querySelector("span");
    const bookTitle = (
      titleSpan?.textContent ?? titleLink.textContent ?? ""
    ).trim();
    if (!bookTitle) return;

    const isbn = titleLink.getAttribute("isbn") ?? "";
    const regNo = titleLink.getAttribute("regNo") ?? "";
    const manageCode = titleLink.getAttribute("manageCode") ?? "";

    let bookUrl = "";
    if (regNo && manageCode) {
      const params = new URLSearchParams({
        regNo,
        isbn,
        menu_idx: "9",
        manageCode,
        booktype: "BOOK",
      });
      bookUrl = `${DETAIL_URL}?${params}`;
    }

    const availTd = row.querySelector("table tbody td");
    const availText = availTd?.textContent?.trim() ?? "";
    const exist = availText.includes("대출가능");

    booklist.push({ libraryName, title: bookTitle, bookUrl, exist });
  });

  return { startPage, totalBookCount, booklist };
}

export const search = wrapWithCallback(searchImpl);

export function getLibraryNames(): string[] {
  return getLibNames(libraryList);
}

({ moduleName, homeUrl, search, getLibraryNames }) satisfies LibraryModule;
