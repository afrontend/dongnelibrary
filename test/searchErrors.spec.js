/**
 * 검색에 실패한 도서관이 결과에서 사라지지 않고 error 와 함께 남는지 확인한다.
 * 빈 fixture 로 재생해 모든 요청을 실패시키므로 네트워크를 쓰지 않는다.
 */
const { describe, it } = require("node:test");
const assert = require("assert").strict;
const dl = require("../dist/dongnelibrary");
const { startReplay, stopReplay } = require("./helpers/httpRecorder");

describe("검색 실패 결과", () => {
  it("실패한 도서관은 error 와 빈 booklist 로 결과 배열에 남는다", async () => {
    const reported = [];
    startReplay([]);
    try {
      const results = await dl.searchAsync(
        { title: "자바", libraryName: ["산본도서관", "당동도서관"] },
        (err) => err && reported.push(err),
      );

      assert.deepEqual(
        results.map((r) => r.libraryName).sort(),
        ["당동도서관", "산본도서관"],
      );
      for (const r of results) {
        assert.ok(r.error, `${r.libraryName} 에 error 가 없다`);
        assert.match(r.error.msg, /fixture 에 없는 요청/);
        assert.equal(r.error.libraryName, r.libraryName);
        assert.deepEqual(r.booklist, []);
        assert.equal(r.totalBookCount, 0);
      }

      assert.deepEqual(
        reported.map((e) => e.libraryName).sort(),
        ["당동도서관", "산본도서관"],
      );
    } finally {
      stopReplay();
    }
  });

  it("오류 코드가 있으면 error.code 로 전달한다", async () => {
    const err = Object.assign(new Error("connect timeout"), {
      code: "UND_ERR_CONNECT_TIMEOUT",
    });
    const { wrapWithCallback } = require("../dist/util");
    const search = wrapWithCallback(async () => {
      throw err;
    });
    const received = await new Promise((resolve) => search({}, resolve));
    assert.deepEqual(received, {
      msg: "connect timeout",
      code: "UND_ERR_CONNECT_TIMEOUT",
    });
  });
});
