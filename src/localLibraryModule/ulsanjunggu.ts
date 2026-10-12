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

export const moduleName = "울산중구도서관";
export const homeUrl = "https://lib.junggu.ulsan.kr";

const SEARCH_URL = `${homeUrl}/lib/unit/search/list.do`;
const VIEW_URL = `${homeUrl}/lib/unit/search/view.do`;
const MENU_ID = "001003001000000000";
// 응답 시간이 페이지 크기에 비례한다 (20=2.4s, 50=5.5s, 100=10.1s)
const DISPLAY = 20;
const VIEW_RE = /fn_view\('([^']+)',\s*'([^']+)'\)/;

const libraryList: LibraryInfo[] = [
  { code: "MM", name: "울산종갓집도서관" },
  { code: "MA", name: "약숫골도서관" },
  { code: "MB", name: "함월도서관" },
  { code: "MC", name: "태화루도서관" },
  { code: "MD", name: "옥골샘도서관" },
  { code: "MF", name: "외솔한옥도서관" },
  { code: "MG", name: "우정도서관" },
  { code: "MH", name: "학성도서관" },
  { code: "MJ", name: "산전만화도서관" },
  { code: "ML", name: "남외어린이도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

function getDataValue(item: Element, label: string): string | undefined {
  for (const dl of item.querySelectorAll(".book_data dl")) {
    if (dl.querySelector("dt")?.textContent?.trim() === label) {
      return dl.querySelector("dd")?.textContent?.replace(/\s+/g, " ").trim();
    }
  }
  return undefined;
}

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { statusCode, body } = await get(SEARCH_URL, {
    qs: {
      mId: MENU_ID,
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

  // <div class="all_count">총 <strong>482</strong>건</div>
  const totalBookCount = extractNumber(
    document
      .querySelector("div.all_count strong")
      ?.textContent?.replace(/,/g, ""),
  );

  const booklist: Book[] = [];

  document.querySelectorAll("div.srch_infolist li.item").forEach((item) => {
    const match = item
      .querySelector("a[onclick*='fn_view']")
      ?.getAttribute("onclick")
      ?.match(VIEW_RE);

    if (!match) return;

    const bookTitle =
      item.querySelector(".book_title .tit")?.textContent?.trim() ?? "";

    if (!bookTitle) return;

    const [, manageCode, regNo] = match;
    const bookUrl =
      `${VIEW_URL}?mId=${MENU_ID}` +
      `&manage_code=${encodeURIComponent(manageCode)}` +
      `&reg_no=${encodeURIComponent(regNo)}`;

    // "대출가능(비치중)" / "대출불가(대출중)"
    const exist = getDataValue(item, "대출여부")?.startsWith("대출가능") ?? false;

    booklist.push({
      libraryName: getDataValue(item, "소장처") ?? libraryName,
      title: bookTitle,
      bookUrl,
      exist,
    });
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
