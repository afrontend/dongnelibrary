/**
 * CLI 의 -l 이 지정한 도서관만 검색하는지 확인한다.
 * 모든 요청을 즉시 실패시켜(failAllRequests) 실패 줄 수로 검색한 도서관 수를 센다.
 */
const { describe, it } = require("node:test");
const assert = require("assert").strict;
const { spawnSync } = require("child_process");
const path = require("path");
const dl = require("../dist/dongnelibrary");

const CLI_PATH = path.join(__dirname, "..", "dist", "cli.js");
const FAIL_ALL = path.join(__dirname, "helpers", "failAllRequests.js");

function searchedLibraryCount(libraryName) {
  const { stdout, status } = spawnSync(
    "node",
    ["-r", FAIL_ALL, CLI_PATH, "-t", "자바", "-l", libraryName],
    { encoding: "utf8", env: { ...process.env, FORCE_COLOR: "0" } },
  );
  assert.equal(status, 0);
  return stdout.split("\n").filter((line) => line.includes("fixture 에 없는 요청"))
    .length;
}

describe("CLI -l 도서관 지정", () => {
  it("도서관 하나만 검색한다", () => {
    assert.equal(searchedLibraryCount("산본도서관"), 1);
  });

  it("부분 이름은 처음 맞는 도서관 하나로 찾는다", () => {
    assert.equal(searchedLibraryCount("판교"), 1);
  });

  it("콤마로 여러 도서관을 지정한다", () => {
    assert.equal(searchedLibraryCount("판교,산본도서관"), 2);
  });

  it("모듈 이름은 그 모듈의 도서관 전체로 펼친다", () => {
    assert.equal(
      searchedLibraryCount("군포시도서관"),
      dl.getLibraryNamesInModule("군포시도서관").length,
    );
  });
});
