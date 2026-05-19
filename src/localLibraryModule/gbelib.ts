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

export const moduleName = "경상북도교육청통합도서관";
export const homeUrl = "https://www.gbelib.kr";

const SEARCH_URL =
  "https://www.gbelib.kr/gbelib/intro/totalSearch/index.do";
const MORE_URL =
  "https://www.gbelib.kr/gbelib/intro/totalSearch/more.do";
const DETAIL_BASE =
  "https://www.gbelib.kr/gbelib/intro/search/detail.do";

const libraryList: LibraryInfo[] = [
  { code: "00147046", name: "경상북도교육청정보센터" },
  { code: "00347034", name: "경상북도교육청연수원" },
  { code: "00147003", name: "경상북도교육청 구미도서관" },
  { code: "00147010", name: "경상북도교육청 안동도서관" },
  { code: "00147011", name: "경상북도교육청 안동도서관용상분관" },
  { code: "00147039", name: "경상북도교육청 안동도서관풍산분관" },
  { code: "00147008", name: "경상북도교육청 상주도서관" },
  { code: "00147040", name: "경상북도교육청 상주도서관화령분관" },
  { code: "00147105", name: "경상북도교육청문화원" },
  { code: "00147013", name: "경상북도교육청 영일도서관" },
  { code: "00147016", name: "경상북도교육청 외동도서관" },
  { code: "00147032", name: "경상북도교육청 영주선비도서관" },
  { code: "00147024", name: "경상북도교육청 영주도서관풍기분관" },
  { code: "00147014", name: "경상북도교육청 금호도서관" },
  { code: "00147020", name: "경상북도교육청 점촌도서관" },
  { code: "00147006", name: "경상북도교육청 점촌도서관가은분관" },
  { code: "00147019", name: "경상북도교육청 의성도서관" },
  { code: "00147022", name: "경상북도교육청 청송도서관" },
  { code: "00147012", name: "경상북도교육청 영양도서관" },
  { code: "00147031", name: "경상북도교육청 영덕도서관" },
  { code: "00147021", name: "경상북도교육청 청도도서관" },
  { code: "00147002", name: "경상북도교육청 고령도서관" },
  { code: "00147009", name: "경상북도교육청 성주도서관" },
  { code: "00147023", name: "경상북도교육청 칠곡도서관" },
  { code: "00147015", name: "경상북도교육청 예천도서관" },
  { code: "00147007", name: "경상북도교육청 봉화도서관" },
  { code: "00147018", name: "경상북도교육청 울진도서관" },
  { code: "00147017", name: "경상북도교육청 울릉도서관" },
];

const getLibraryCode = createLibraryCodeLookup(libraryList);

function parseBookRows(html: string): Book[] {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const booklist: Book[] = [];

  document.querySelectorAll("div.row").forEach((row) => {
    const bif = row.querySelector("div.bif");
    if (!bif) return;

    const titleLink = bif.querySelector("a.name.goDetail");
    if (!titleLink) return;

    const rawTitle = titleLink.textContent ?? "";
    const bookTitle = rawTitle.replace(/<[^>]+>/g, "").trim();
    if (!bookTitle) return;

    const vLoca = titleLink.getAttribute("vLoca") ?? "";
    const vCtrl = titleLink.getAttribute("vCtrl") ?? "";
    const bookUrl =
      vLoca && vCtrl
        ? `${DETAIL_BASE}?vLoca=${vLoca}&vCtrl=${vCtrl}&menu_idx=150`
        : "";

    const paragraphs = Array.from(bif.querySelectorAll("p"));
    let libName = "";
    for (const p of paragraphs) {
      const text = (p.textContent ?? "").trim();
      if (
        text &&
        !text.includes("저자") &&
        !text.includes("출판사") &&
        !text.includes("발행")
      ) {
        libName = text;
        break;
      }
    }

    booklist.push({ libraryName: libName, title: bookTitle, bookUrl, exist: false });
  });

  return booklist;
}

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, signal } = opt;

  validateSearchOptions(opt);

  const lcode = getLibraryCode(libraryName);

  const qs = {
    menu_idx: 150,
    search_text: title,
    search_type: "L_TITLE",
    total_search_type: "TOTAL",
    search_detail_yn: "N",
    book_more_count: 1,
    libraryCodes: lcode,
  };

  const { statusCode, body } = await get(SEARCH_URL, { qs, signal });
  if (statusCode !== 200) throw new Error(`HTTP ${statusCode}`);

  const dom = new JSDOM(body);
  const totalText =
    dom.window.document.getElementById("bookTotalCnt")?.textContent ?? "0";
  const totalBookCount = parseInt(totalText.replace(/,/g, ""), 10) || 0;

  const booklist = parseBookRows(body);

  // fetch more batches in parallel (up to 9 more calls for ~30 books total)
  if (totalBookCount > 3) {
    const batchCount = Math.min(9, Math.ceil((totalBookCount - 3) / 3));
    const moreQs = { ...qs, more_type: "BOOK" };
    const moreFetches = Array.from({ length: batchCount }, (_, i) => {
      return get(MORE_URL, {
        qs: { ...moreQs, book_more_count: i + 2 },
        signal,
      }).then(({ body: moreBody }) => parseBookRows(moreBody));
    });

    const moreBatches = await Promise.all(moreFetches);
    for (const batch of moreBatches) {
      booklist.push(...batch);
    }
  }

  return { startPage: opt.startPage, totalBookCount, booklist };
}

export const search = wrapWithCallback(searchImpl);

export function getLibraryNames(): string[] {
  return getLibNames(libraryList);
}

({ moduleName, homeUrl, search, getLibraryNames }) satisfies LibraryModule;
