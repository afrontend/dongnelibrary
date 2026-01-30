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

export const moduleName = "용인시도서관";
export const homeUrl = "https://lib.yongin.go.kr";

const libraryList: LibraryInfo[] = [
  // Public libraries (시립도서관)
  { code: "MB", name: "수지도서관" },
  { code: "MI", name: "구갈희망누리도서관" },
  { code: "MD", name: "구성도서관" },
  { code: "MK", name: "기흥도서관" },
  { code: "MY", name: "남사도서관" },
  { code: "MF", name: "동백도서관" },
  { code: "NA", name: "동천도서관" },
  { code: "ML", name: "모현도서관" },
  { code: "MM", name: "보라도서관" },
  { code: "MO", name: "상현도서관" },
  { code: "MZ", name: "서농도서관" },
  { code: "NB", name: "성복도서관" },
  { code: "MA", name: "용인중앙도서관" },
  { code: "MJ", name: "양지해밀도서관" },
  { code: "NN", name: "영덕도서관" },
  { code: "MX", name: "이동꿈틀도서관" },
  { code: "ME", name: "죽전도서관" },
  { code: "MP", name: "청덕도서관" },
  { code: "MC", name: "포곡도서관" },
  { code: "MN", name: "흥덕도서관" },
  // Smart libraries (스마트도서관)
  { code: "NO", name: "기흥동행정복지센터스마트도서관" },
  { code: "NJ", name: "기흥역스마트도서관" },
  { code: "NF", name: "동천동행정복지센터스마트도서관" },
  { code: "NS", name: "마북동행정복지센터스마트도서관" },
  { code: "NG", name: "보정동행정복지센터스마트도서관" },
  { code: "NP", name: "상갈동행정복지센터스마트도서관" },
  { code: "NT", name: "상하동행정복지센터스마트도서관" },
  { code: "NH", name: "성복역스마트도서관" },
  { code: "NL", name: "시청스마트도서관" },
  { code: "NI", name: "신봉동행정복지센터스마트도서관" },
  { code: "NR", name: "역북동행정복지센터스마트도서관" },
  { code: "NM", name: "용인중앙시장역스마트도서관" },
  { code: "ND", name: "원삼면스마트도서관" },
  { code: "NQ", name: "유방어린이공원스마트도서관" },
  { code: "NK", name: "죽전역스마트도서관" },
  // Small libraries (작은도서관)
  { code: "NC", name: "고림다온작은도서관" },
  { code: "MS", name: "남사맑은누리작은도서관" },
  { code: "MT", name: "백암면작은도서관" },
  { code: "MW", name: "상현1동작은도서관" },
  { code: "MQ", name: "상현2동작은도서관" },
  { code: "MV", name: "이동천리작은도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

/**
 * Search for books in Yongin City Libraries.
 */
async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const { statusCode, body } = await get(
    `https://lib.yongin.go.kr/intro/menu/10003/program/30012/plusSearchResultList.do`,
    {
      qs: {
        searchType: "SIMPLE",
        searchCategory: "ALL",
        searchLibraryArr: lcode,
        searchKey: "ALL",
        searchKeyword: title,
        searchRecordCount: 1000,
      },
      signal,
    },
  );

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const dom = new JSDOM(body);
  const document = dom.window.document;

  // Extract total count from "총<strong class="highlight">44</strong> 건"
  // Note: First .highlight element contains search term, second contains the count
  const highlightElems = document.querySelectorAll(".highlight");
  const count = extractNumber(highlightElems[1]?.textContent);

  const booklist: Book[] = [];
  const bookItems = document.querySelectorAll(".bookList .listWrap > li");
  bookItems.forEach((li) => {
    // Get title and book URL from .book_name link
    const titleLink = li.querySelector(".book_name a");
    // Title is the text content of the link, excluding the book_kind badge
    let bookTitle = "";
    if (titleLink) {
      // Clone the node and remove the book_kind element to get clean title
      const clone = titleLink.cloneNode(true) as Element;
      const bookKind = clone.querySelector(".book_kind");
      if (bookKind) bookKind.remove();
      bookTitle = clone.textContent?.trim() ?? "";
    }

    // Extract book URL from onclick handler
    let bookUrl = "";
    const onclick = titleLink ? titleLink.getAttribute("onclick") || "" : "";
    const urlMatch = onclick.match(
      /fnSearchResultDetail\((\d+),(\d+),'(\w+)'\)/,
    );
    if (urlMatch) {
      const [, recKey, bookKey, publishFormCode] = urlMatch;
      bookUrl = `https://lib.yongin.go.kr/intro/menu/10003/program/30012/plusSearchResultDetail.do?recKey=${recKey}&bookKey=${bookKey}&publishFormCode=${publishFormCode}`;
    }

    // Get availability status from .status p
    const statusEl = li.querySelector(".status p");
    const statusText = statusEl ? statusEl.textContent?.trim() ?? "" : "";
    const exist = statusText.includes("대출가능");

    // Get library name from ".book_info.info03 p" (first p contains library name)
    let libName = "";
    const info03 = li.querySelector(".book_info.info03");
    if (info03) {
      const firstP = info03.querySelector("p");
      if (firstP) {
        libName = firstP.textContent?.trim() ?? "";
      }
    }

    if (bookTitle) {
      booklist.push({
        libraryName: libName,
        title: bookTitle,
        bookUrl,
        maxoffset: count,
        exist: exist,
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
