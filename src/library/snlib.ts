import {
  getLibraryNames as getLibNames,
  createLibraryCodeLookup,
  validateSearchOptions,
  extractNumber,
  wrapWithCallback,
} from "../util";
import { get } from "../http";
import { JSDOM } from "jsdom";
import type { Book, LibraryInfo, SearchOptions, SearchResult } from "../types";

export const moduleName = "성남시도서관";
export const homeUrl = "https://www.snlib.go.kr";

const libraryList: LibraryInfo[] = [
  { code: "BF", name: "논골도서관" },
  { code: "CK", name: "중원어린이도서관" },
  { code: "MA", name: "성남중앙도서관" },
  { code: "MB", name: "분당도서관" },
  { code: "MD", name: "고등도서관" },
  { code: "MG", name: "구미도서관" },
  { code: "MH", name: "해오름도서관" },
  { code: "MJ", name: "중원도서관" },
  { code: "MM", name: "무지개도서관" },
  { code: "MO", name: "수내도서관" },
  { code: "MP", name: "판교도서관" },
  { code: "MR", name: "위례도서관" },
  { code: "MS", name: "수정도서관" },
  { code: "MT", name: "책테마파크도서관" },
  { code: "MU", name: "운중도서관" },
  { code: "MV", name: "서현도서관" },
  { code: "MW", name: "복정도서관" },
  { code: "PK", name: "판교어린이도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

/**
 * Search for books in Seongnam City Libraries.
 */
async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { statusCode, body } = await get(
    "https://www.snlib.go.kr/intro/menu/10041/program/30009/plusSearchResultList.do",
    {
      qs: {
        currentPageNo: 1,
        searchBookClass: "ALL",
        searchCategory: "BOOK",
        searchKey: "ALL",
        searchKeyword: title,
        searchLibraryArr: lcode,
        searchOrder: "DESC",
        searchRecordCount: 1000,
        searchSort: "SIMILAR",
        searchType: "SIMPLE",
      },
    },
  );

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  const countText = document.querySelector("strong.themeFC")?.textContent ?? "";
  const count = extractNumber(countText);

  const booklist: Book[] = [];
  if (count) {
    const bookItems = document.querySelectorAll(".resultList > li");
    bookItems.forEach((item) => {
      const titleElement = item.querySelector(".tit a");
      const bookTitle = titleElement?.textContent?.trim() ?? "";
      const onclick = titleElement?.getAttribute("onclick") ?? "";
      const match = onclick.match(
        /fnSearchResultDetail\((\d+),(\d+),'(\w+)'\)/,
      );
      let bookUrl = "";
      if (match) {
        const [, recKey, bookKey, publishFormCode] = match;
        bookUrl = `https://www.snlib.go.kr/intro/menu/10041/program/30009/plusSearchResultDetail.do?recKey=${recKey}&bookKey=${bookKey}&publishFormCode=${publishFormCode}`;
      }
      const availability =
        item.querySelector(".bookStateBar .txt b")?.textContent ?? "";
      // Format: "소장처:도서관이름" - split by colon to extract library name
      const siteText =
        item.querySelector(".site > span:first-child")?.textContent ?? "";
      const libraryNameParts = siteText.split(":");
      const libName =
        libraryNameParts && libraryNameParts[1]
          ? libraryNameParts[1].trim()
          : "";
      if (bookTitle) {
        booklist.push({
          libraryName: libName,
          title: bookTitle,
          bookUrl,
          maxoffset: count,
          exist: availability.includes("대출가능"),
        });
      }
    });
  }

  return {
    startPage: opt.startPage,
    totalBookCount: count,
    booklist,
  };
}

export const search = wrapWithCallback(searchImpl);

export function getLibraryNames(): string[] {
  return getLibNames(libraryList);
}
