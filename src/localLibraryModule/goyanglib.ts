import {
  getLibraryNames as getLibNames,
  validateSearchOptions,
  extractNumber,
  stripHtml,
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

export const moduleName = "고양시도서관";
export const homeUrl = "https://goyanglib.or.kr";

const SEARCH_URL = `${homeUrl}/search/include/aggsBookList.do`;

type GoyangLib = LibraryInfo & { menu: string };

const libraryList: GoyangLib[] = [
  { code: "MT", name: "가좌도서관", menu: "12763" },
  { code: "MV", name: "높빛도서관", menu: "130122" },
  { code: "MJ", name: "대화도서관", menu: "11539" },
  { code: "MN", name: "덕이도서관", menu: "12151" },
  { code: "MA", name: "마두도서관", menu: "10162" },
  { code: "MD", name: "백석도서관(휴관)", menu: "10621" },
  { code: "MQ", name: "별꿈도서관", menu: "12610" },
  { code: "MP", name: "삼송도서관", menu: "12457" },
  { code: "MM", name: "식사도서관", menu: "11998" },
  { code: "MO", name: "신원도서관", menu: "12304" },
  { code: "MF", name: "아람누리도서관", menu: "10927" },
  { code: "MC", name: "원당도서관(휴관)", menu: "10468" },
  { code: "MU", name: "일산도서관", menu: "12916" },
  { code: "MG", name: "주엽어린이도서관", menu: "11080" },
  { code: "ML", name: "풍동도서관", menu: "11845" },
  { code: "MK", name: "한뫼도서관", menu: "11692" },
  { code: "MB", name: "행신도서관", menu: "10315" },
  { code: "MH", name: "행신어린이도서관", menu: "11233" },
  { code: "ME", name: "화정도서관", menu: "10774" },
  { code: "MI", name: "화정어린이도서관", menu: "11386" },
];

function getLib(name: string): GoyangLib {
  return libraryList.find((l) => l.name === name) ?? libraryList[0];
}

function parseSearchResult(
  body: string,
  lib: GoyangLib,
  startPage: number | undefined,
): SearchResult {
  const totalMatch = body.match(/\$\('#totalCnt'\)\.text\("([\d,]+)"\)/);
  const totalBookCount = totalMatch
    ? parseInt(totalMatch[1].replace(/,/g, ""), 10)
    : 0;

  const {
    window: { document },
  } = new JSDOM(body);

  const booklist: Book[] = [];

  document.querySelectorAll<HTMLElement>("ul.listWrap > li").forEach((li) => {
    const titleAnchor = li.querySelector<HTMLAnchorElement>(
      ".book_name p.kor.on a[title]",
    );
    const bookTitle = stripHtml(titleAnchor?.getAttribute("title") ?? "").trim();
    if (!bookTitle) return;

    const onclickMatch = titleAnchor
      ?.getAttribute("onclick")
      ?.match(/fnDetail\('(\d+)',\s*'(\d+)',\s*'([^']*)',\s*'([A-Z]+)'\)/);

    let bookUrl = "";
    if (onclickMatch) {
      const [, bookKey, speciesKey, isbn, pubFormCode] = onclickMatch;
      bookUrl =
        `${homeUrl}/${lib.code}/menu/${lib.menu}/program/30001/searchResultDetail.do` +
        `?bookKey=${bookKey}&speciesKey=${speciesKey}&isbn=${isbn}&pubFormCode=${pubFormCode}`;
    }

    const btnWrap = li.querySelector("div.bookBtnWrap");
    const exist = btnWrap?.classList.contains("sRent1") ?? false;

    booklist.push({ libraryName: lib.name, title: bookTitle, bookUrl, exist });
  });

  return { startPage, totalBookCount, booklist };
}

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, startPage = 1, signal } = opt;

  validateSearchOptions(opt);

  const lib = getLib(libraryName);

  const { statusCode, body } = await post(SEARCH_URL, {
    form: {
      searchType: "SIMPLE",
      searchKeyword: title,
      searchManageCode: lib.code,
      searchManageCodeArr: lib.code,
      currentPageNo: String(startPage),
      searchDisplay: "20",
      searchArticle: "SCORE",
      searchOrder: "ASC",
      viewType: "LIST",
      searchPubFormCode: "ALL",
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  return parseSearchResult(body, lib, startPage);
}

export const search = wrapWithCallback(searchImpl);

export function getLibraryNames(): string[] {
  return getLibNames(libraryList);
}

({ moduleName, homeUrl, search, getLibraryNames }) satisfies LibraryModule;
