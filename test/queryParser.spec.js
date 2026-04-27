const { describe, it } = require("node:test");
const assert = require("assert").strict;
const { parseQueryString } = require("../dist/queryParser");

// Fixed library name list for deterministic tests
const LIBRARY_NAMES = [
  "판교도서관",
  "판교어린이도서관",
  "분당도서관",
  "정자도서관",
  "성남시립도서관",
  "성남어린이도서관",
  "군포시도서관",
];

describe("parseQueryString", () => {
  // ------------------------------------------------------------------
  // Step 1: Comma-separated multi-library
  // ------------------------------------------------------------------

  describe("Step 1 — 콤마로 구분된 다중 도서관", () => {
    it("콤마 토큰의 각 부분이 도서관 이름과 매칭되면 배열로 반환", () => {
      const result = parseQueryString("판교,분당 해리포터", LIBRARY_NAMES);
      assert.deepStrictEqual(result, {
        libraryName: ["판교도서관", "분당도서관"],
        title: "해리포터",
      });
    });

    it("제목이 앞에 있어도 콤마 토큰을 올바르게 처리", () => {
      const result = parseQueryString("해리포터 판교,정자", LIBRARY_NAMES);
      assert.deepStrictEqual(result, {
        libraryName: ["판교도서관", "정자도서관"],
        title: "해리포터",
      });
    });

    it("콤마 토큰 중 하나라도 매칭 실패하면 null 반환", () => {
      // "없는도서관"은 매칭 실패 → Step 1 스킵
      // Step 2: "판교도서관"이 쿼리 "판교,없는도서관 해리포터"의 부분 문자열이 아님
      // Step 3: "판교,없는도서관" 토큰 전체가 어느 도서관 이름에도 포함되지 않음
      // → null 반환이 올바른 동작
      const result = parseQueryString("판교,없는도서관 해리포터", LIBRARY_NAMES);
      assert.strictEqual(result, null);
    });

    it("제목 없이 콤마 토큰만 있으면 null 반환", () => {
      const result = parseQueryString("판교,분당", LIBRARY_NAMES);
      assert.strictEqual(result, null);
    });
  });

  // ------------------------------------------------------------------
  // Step 2: Exact match (longest name wins)
  // ------------------------------------------------------------------

  describe("Step 2 — 완전 이름 일치 (긴 이름 우선)", () => {
    it("완전 이름 일치 시 해당 도서관 반환", () => {
      const result = parseQueryString("판교도서관 해리포터", LIBRARY_NAMES);
      assert.deepStrictEqual(result, {
        libraryName: "판교도서관",
        title: "해리포터",
      });
    });

    it("제목이 도서관 이름 앞에 있어도 처리", () => {
      const result = parseQueryString("해리포터 판교도서관", LIBRARY_NAMES);
      assert.deepStrictEqual(result, {
        libraryName: "판교도서관",
        title: "해리포터",
      });
    });

    it("짧은 이름이 긴 이름의 부분 문자열일 때 긴 이름 우선 매칭", () => {
      // "판교도서관"이 "판교어린이도서관"보다 먼저 체크될 수 있으나
      // Step 2는 길이 내림차순 → "판교어린이도서관"(8자)이 "판교도서관"(5자)보다 먼저 체크
      const result = parseQueryString("판교어린이도서관 해리포터", LIBRARY_NAMES);
      assert.deepStrictEqual(result, {
        libraryName: "판교어린이도서관",
        title: "해리포터",
      });
    });
  });

  // ------------------------------------------------------------------
  // Step 3: Partial match
  // ------------------------------------------------------------------

  describe("Step 3 — 부분 이름 일치", () => {
    it("부분 이름이 하나의 도서관에만 매칭되면 문자열 반환", () => {
      const result = parseQueryString("분당 해리포터", LIBRARY_NAMES);
      assert.deepStrictEqual(result, {
        libraryName: "분당도서관",
        title: "해리포터",
      });
    });

    it("부분 이름이 여러 도서관에 매칭되면 배열 반환", () => {
      // "판교"는 "판교도서관", "판교어린이도서관" 둘 다 포함
      const result = parseQueryString("판교 해리포터", LIBRARY_NAMES);
      assert.ok(result !== null);
      assert.ok(Array.isArray(result.libraryName), "여러 매칭 시 배열이어야 함");
      assert.ok(result.libraryName.includes("판교도서관"));
      assert.ok(result.libraryName.includes("판교어린이도서관"));
      assert.strictEqual(result.title, "해리포터");
    });
  });

  // ------------------------------------------------------------------
  // null 반환 케이스
  // ------------------------------------------------------------------

  describe("null 반환 케이스", () => {
    it("도서관 이름이 없으면 null", () => {
      assert.strictEqual(parseQueryString("해리포터", LIBRARY_NAMES), null);
    });

    it("제목이 없으면 null", () => {
      assert.strictEqual(parseQueryString("판교도서관", LIBRARY_NAMES), null);
    });

    it("도서관 목록이 비어 있으면 null", () => {
      assert.strictEqual(parseQueryString("판교 해리포터", []), null);
    });

    it("매칭되지 않는 토큰만 있으면 null", () => {
      assert.strictEqual(
        parseQueryString("zzznolibrary 해리포터", LIBRARY_NAMES),
        null,
      );
    });
  });
});
