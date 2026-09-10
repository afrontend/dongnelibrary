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

export const moduleName = "부산광역시교육청도서관";
export const homeUrl = "https://home.pen.go.kr";

// 시민도서관 서브사이트 하나로 부산 통합도서관 전체를 manageCode로 조회할 수 있다
const SEARCH_FORM_URL = `${homeUrl}/siminlib/library/searchList.do?mi=13190`;
const SEARCH_URL = `${homeUrl}/siminlib/library/searchListAjax.do`;
const DETAIL_URL = `${homeUrl}/siminlib/library/searchView.do`;

// 표시개수 셀렉트 박스는 50까지 열려 있으나 50건이 5.3초, 20건이 2.6초
const DISPLAY_COUNT = 20;

const libraryList: LibraryInfo[] = [
  { code: "AG", name: "시민도서관" },
  { code: "AA", name: "구덕도서관" },
  { code: "AB", name: "구포도서관" },
  { code: "AC", name: "반송도서관" },
  { code: "AD", name: "부전도서관" },
  { code: "AE", name: "사하도서관" },
  { code: "AF", name: "서동도서관" },
  { code: "AH", name: "중앙도서관수정분관" },
  { code: "AJ", name: "연산도서관" },
  { code: "AK", name: "중앙도서관" },
  { code: "AL", name: "해운대도서관우동분관" },
  { code: "AN", name: "명장도서관" },
  { code: "BD", name: "해운대도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  // JSESSIONID 쿠키와 폼의 csrfToken이 모두 있어야 검색됨 (없으면 400)
  const session = createSession();
  const { body: formBody } = await session.get(SEARCH_FORM_URL, { signal });
  const csrfToken = formBody.match(/name="csrfToken" value="([^"]+)"/)?.[1] ?? "";

  // 사이트 스크립트가 #libSearchForm 을 통째로 serialize 하며,
  // 필드를 하나라도 빼면 400 오류 페이지를 돌려준다
  const { statusCode, body } = await session.post(SEARCH_URL, {
    form: {
      csrfToken,
      searchType: "search_title",
      searchText: title,
      searchAuthor: "search_author",
      searchAuthorTxt: "",
      orderByItem: "",
      orderBy: "ASC",
      bookType: "booksearch",
      searchShelf: "",
      searchIsbnIssn: "",
      subjectCode: "",
      searchYearStart: "",
      searchYearEnd: "",
      display: String(DISPLAY_COUNT),
      pageNo: String(opt.startPage ?? 1),
      manageCode: lcode,
      subType: "",
    },
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const {
    window: { document },
  } = new JSDOM(body);

  const totalBookCount = extractNumber(
    document.querySelector("#totalCount")?.textContent ?? "",
  );

  const booklist: Book[] = [];

  document.querySelectorAll("ul.bbs_book > li").forEach((item) => {
    const anchor = item.querySelector("a.selectNttInfo");
    const bookTitle = anchor?.getAttribute("title")?.trim() ?? "";

    if (!bookTitle) return;

    // goLibView('reckey', 'loancode', ..., 'manageCode') 에서 상세 조회 키를 얻는다
    const reckey =
      anchor?.getAttribute("onclick")?.match(/goLibView\('([^']+)'/)?.[1] ?? "";
    const bookUrl = reckey
      ? `${DETAIL_URL}?reckey=${reckey}&manageCode=${lcode}&subType=`
      : "";

    const infoItems = Array.from(item.querySelectorAll("ul.info_list > li"));
    const findInfo = (label: string) =>
      infoItems
        .find((li) => li.querySelector("strong")?.textContent?.trim() === label)
        ?.querySelector("p")
        ?.textContent?.trim() ?? "";

    const libName = findInfo("소장도서관") || libraryName;
    const exist =
      item
        .querySelector("strong[data-loancode]")
        ?.getAttribute("data-loancode") === "OK";

    booklist.push({ libraryName: libName, title: bookTitle, bookUrl, exist });
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
