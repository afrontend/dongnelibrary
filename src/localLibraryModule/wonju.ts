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

export const moduleName = "원주시립통합도서관";
export const homeUrl = "https://lib.wonju.go.kr/";

const libraryList: LibraryInfo[] = [
  { code: "MA", name: "시립중앙도서관" },
  { code: "MC", name: "중천철학도서관" },
  { code: "MQ", name: "미리내도서관" },
  { code: "MB", name: "태장도서관" },
  { code: "MS", name: "샘마루도서관" },
  { code: "MT", name: "그림책도서관" },
  { code: "MU", name: "생각자람어린이도서관" },
  { code: "ME", name: "귀래면작은도서관" },
  { code: "MO", name: "원주한도시한책읽기도서관" },
  { code: "MD", name: "개운동작은도서관" },
  { code: "MN", name: "치악산새마을문고작은도서관" },
  { code: "MF", name: "무실동작은도서관" },
  { code: "MG", name: "문막읍작은도서관" },
  { code: "MH", name: "봉산동작은도서관" },
  { code: "MM", name: "도란도란청소년도서관" },
  { code: "MR", name: "부론면작은도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { statusCode, body } = await get(
    "https://lib.wonju.go.kr/ja/menu/234/book/search",
    {
      qs: {
        search: "true",
        searchCondition: "searchTxt",
        searchInput: title,
        manageCodes: lcode,
        size: 1000,
        page: 1,
      },
      signal,
    },
  );

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  const countEl = document.querySelector("strong.point");
  const count = extractNumber(countEl?.textContent);

  const booklist: Book[] = [];
  const articles = document.querySelectorAll("article.book");
  articles.forEach((article) => {
    const bookData = article.querySelector(".bookData");

    const bookTitle =
      bookData?.getAttribute("data-title") ??
      article.querySelector(".title")?.textContent?.trim() ??
      "";

    const regNo = bookData?.getAttribute("data-reg-no") ?? "";
    const bookUrl = regNo
      ? `https://lib.wonju.go.kr/ja/menu/234/book/view/${regNo}?booktype=`
      : "";

    const libNameEl = article.querySelector(".lib_name");
    const libName =
      libNameEl?.firstChild?.textContent?.trim() ?? libraryName;

    const loanEl = article.querySelector(".lib_name strong");
    const loanText = loanEl?.textContent?.trim() ?? "";
    const exist = loanText.includes("대출가능");

    if (bookTitle) {
      booklist.push({
        libraryName: libName,
        title: bookTitle,
        bookUrl,
        exist,
      });
    }
  });

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

({ moduleName, homeUrl, search, getLibraryNames }) satisfies LibraryModule;
