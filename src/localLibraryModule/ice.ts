import {
  getLibraryNames as getLibNames,
  createLibraryCodeLookup,
  validateSearchOptions,
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

export const moduleName = "인천광역시교육청통합공공도서관";
export const homeUrl = "https://lib.ice.go.kr/";

const libraryList: LibraryInfo[] = [
  { code: "lib_ME", name: "인천광역시교육청계양도서관" },
  { code: "lib_MC", name: "인천광역시교육청부평도서관" },
  { code: "lib_MF", name: "인천광역시교육청서구도서관" },
  { code: "lib_MA", name: "인천광역시교육청신트리도서관" },
  { code: "lib_MH", name: "인천광역시교육청연수도서관" },
  { code: "lib_MD", name: "인천광역시교육청주안도서관" },
  { code: "lib_MB", name: "인천광역시교육청중앙도서관" },
  { code: "lib_MJ", name: "인천광역시교육청평생학습관도서관" },
  { code: "lib_MG", name: "인천광역시교육청화도진도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

function buildSearchUrl(title: string, lcode: string): string {
  const params = new URLSearchParams();
  params.append("menu_idx", "11");
  params.append("viewPage", "1");
  params.append("libraryCodes", "ALL");
  params.append("_libraryCodes", "on");
  params.append("libraryCodes", lcode);
  params.append("_libraryCodes", "on");
  params.append("search_type", "L_TITLE");
  params.append("search_text", title);
  params.append("booktype", "BOOK");
  params.append("rowCount", "1000");
  return `https://lib.ice.go.kr/ice/intro/search/index.do?${params}`;
}

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const url = buildSearchUrl(title, lcode);

  const { statusCode, body } = await get(url, { signal });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  const bodyText = document.body?.textContent ?? "";
  const countMatch = bodyText.match(/총\s*(\d+)건/);
  const count = countMatch ? Number(countMatch[1]) : 0;

  const booklist: Book[] = [];
  const bookItems = document.querySelectorAll(".bif");
  bookItems.forEach((item) => {
    const titleLink = item.querySelector("a.goDetail");
    const bookTitle = titleLink?.textContent?.trim() ?? "";
    const regNo = titleLink?.getAttribute("regno") ?? "";
    const manageCode = titleLink?.getAttribute("managecode") ?? "";

    const bookUrl = regNo
      ? `https://lib.ice.go.kr/ice/intro/search/detail.do?regNo=${regNo}&manageCode=${manageCode}&booktype=BOOK`
      : "";

    const paragraphs = item.querySelectorAll("p");
    let libName = "";
    for (const p of paragraphs) {
      const text = p.textContent ?? "";
      if (text.includes("소장처")) {
        const match = text.match(/소장처\s*:\s*([^/]+)/);
        libName = match ? match[1].trim() : "";
        break;
      }
    }

    const availCell = item.querySelector("td");
    const availability = availCell?.textContent?.trim() ?? "";

    if (bookTitle) {
      booklist.push({
        libraryName: libName || libraryName,
        title: bookTitle,
        bookUrl,
        exist: availability === "대출가능",
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
