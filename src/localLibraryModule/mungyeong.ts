import { validateSearchOptions, wrapWithCallback } from "../util";
import { post } from "../http";
import { parseHtml } from "../html";
import type {
  Book,
  LibraryModule,
  SearchOptions,
  SearchResult,
} from "../types";

export const moduleName = "문경시립도서관";
export const homeUrl = "https://www.gbmg.go.kr/portal/contents.do?mId=0602050800";

// 시청 포털의 "도서검색" 메뉴가 연결하는 KOLAS3 검색. http 8080 포트만 열려 있다.
const KOLAS_BASE = "http://book.gbmg.go.kr:8080/kolas3_01";
const SEARCH_URL = `${KOLAS_BASE}/BookSearch/search_result.do`;
const DETAIL_URL = `${KOLAS_BASE}/BookSearch/detailview_result.do`;
// 상세는 검색식+순번으로 POST 해야만 열려 GET 링크가 없다. 검색 화면을 bookUrl 로 준다.
const BOOK_URL = `${KOLAS_BASE}/BookStand/search_simple.do`;
const ROW_COUNT = 20;

// 폼의 도서관 select 는 다른 지자체 템플릿(MGC:..)이 남아 있어 쓸 수 없다.
// 자료실 코드(PL)를 검색식으로 묶어 subselect1 에 넣으면 그대로 AND 조건이 된다. 전자책 자료실은 뺐다.
// prefix 는 목록·상세의 자료실 이름 앞 "[중앙]" 부분이다.
const libraryList = [
  {
    name: "문경시립중앙도서관",
    prefix: "중앙",
    rooms: ["000", "001", "002", "003", "005", "006", "007", "008", "009", "010", "011"],
  },
  { name: "문경시립모전도서관", prefix: "모전", rooms: ["200", "201", "202", "204", "205", "206", "207", "208", "209", "210"] },
  { name: "문경시립문희도서관", prefix: "문희", rooms: ["100", "101", "102"] },
  { name: "동로작은도서관", prefix: "동로", rooms: ["301"] },
  { name: "마성작은도서관", prefix: "마성", rooms: ["401"] },
  { name: "산양작은도서관", prefix: "산양", rooms: ["501"] },
  { name: "농암작은도서관", prefix: "농암", rooms: ["601"] },
  { name: "영순작은도서관", prefix: "영순", rooms: ["700"] },
  { name: "산북작은도서관", prefix: "산북", rooms: ["801"] },
  { name: "호계작은도서관", prefix: "호계", rooms: ["901"] },
];

const roomQuery = (rooms: string[]) =>
  `(${rooms.map((r) => `PL:${r}`).join(" OR ")})`;

// "[중앙]종합자료실" → 문경시립중앙도서관. 접두사 없는 "스마트도서관"(011)은 중앙도서관 소속이다.
function libraryNameOfRoom(room: string): string | undefined {
  const prefix = room.match(/^\[([^\]]+)\]/)?.[1] ?? "중앙";
  return libraryList.find((lib) => lib.prefix === prefix)?.name;
}

// 브라우저 폼이 보내는 필드를 모두 보내야 한다. 하나라도 빠지면 500 "검색결과 받기에 실패했습니다".
function searchForm(title: string, rooms: string, startPage: number) {
  return {
    select1: "1",
    subselect1: rooms,
    subselect2: "none",
    jongbook: "",
    field1: "IT",
    value1: title,
    aon1: "AND",
    field2: "IT",
    value2: "",
    aon2: "AND",
    field3: "IA",
    value3: "",
    aon3: "AND",
    buho1: "SIB",
    buhovalue1: "",
    aon4: "AND",
    buho2: "KDC",
    buhovalue2: "",
    aon5: "AND",
    buhovalue3: "",
    univname: "",
    aon6: "AND",
    buhovalue4: "",
    govname: "",
    sort: "RK DESC",
    msa: "",
    formclass: "",
    textlang: "",
    simplelang: "",
    startyear: "",
    endyear: "",
    limitpage: ROW_COUNT,
    local: " ",
    startpage: startPage,
    mode: "0",
  };
}

// 목록에는 대출 상태가 없어 상세를 연다. 상세는 결과 페이지의 검색식(beforequery)과
// 전체 결과 안의 순번(offset)만으로 세션 없이 열린다.
async function fetchExist(
  beforequery: string,
  offset: string,
  libraryName: string,
  signal?: AbortSignal,
): Promise<boolean> {
  const { statusCode, body } = await post(DETAIL_URL, {
    form: {
      sort: "RK DESC",
      beforequery,
      msa: "M",
      offset,
      jongbook: "",
      historycount: "0",
      book_code: "",
    },
    signal,
  });
  if (statusCode !== 200) return false;

  const document = parseHtml(body);
  // 소장 행의 칸: 선택 | 대출상태 | 청구기호 | 반납예정일 | 등록번호 | 낱권 | 자료실 | 가격 | 매체
  return Array.from(document.querySelectorAll("tr")).some((tr) => {
    const cells = tr.querySelectorAll("td.view2");
    if (cells.length < 7) return false;
    const status = cells[1].textContent?.trim() ?? "";
    const room = cells[6].textContent?.trim() ?? "";
    return status.startsWith("대출가능") && libraryNameOfRoom(room) === libraryName;
  });
}

async function searchImpl(opt: SearchOptions): Promise<SearchResult> {
  const { title, libraryName, startPage = 1, signal } = opt;

  validateSearchOptions(opt);

  const lib = libraryList.find((l) => l.name === libraryName);
  const rooms = roomQuery(lib ? lib.rooms : libraryList.flatMap((l) => l.rooms));

  const { statusCode, body } = await post(SEARCH_URL, {
    form: searchForm(title, rooms, startPage),
    signal,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`);
  }

  const document = parseHtml(body);

  // 결과 없음이면 value="" 로 온다.
  const totalBookCount = Number(
    document.querySelector('form[name="research"] input[name="resultcount"]')
      ?.getAttribute("value") || 0,
  );
  const beforequery =
    document
      .querySelector('form[name="detailview"] input[name="beforequery"]')
      ?.getAttribute("value") ?? "";

  // 결과 표가 레이아웃 표 안에 들어 있어 "링크를 품은 tr" 로 거르면 바깥 tr 까지 한 행으로 잡힌다.
  const links = Array.from(
    document.querySelectorAll('td.view a[href^="javascript:detailview("]'),
  );

  const booklist: Book[] = await Promise.all(
    links.map(async (link) => {
      const tr = link.closest("tr")!;
      const offset = link.getAttribute("href")?.match(/detailview\('(\d+)'/)?.[1] ?? "";
      // 칸: 번호 | 표제 | 저자 | 출판사 | 발행년도 | 자료실 | 자료구분
      const cells = tr.querySelectorAll("td.view");
      const room = cells[5]?.textContent?.trim() ?? "";
      const libName = libraryNameOfRoom(room) ?? libraryName;
      const exist =
        beforequery && offset
          ? await fetchExist(beforequery, offset, libName, signal)
          : false;

      return {
        libraryName: libName,
        title: (link.textContent ?? "").replace(/\s+/g, " ").trim(),
        bookUrl: BOOK_URL,
        exist,
      };
    }),
  );

  return { startPage, totalBookCount, booklist };
}

export const search = wrapWithCallback(searchImpl);

export function getLibraryNames(): string[] {
  return libraryList.map((lib) => lib.name);
}

({ moduleName, homeUrl, search, getLibraryNames }) satisfies LibraryModule;
