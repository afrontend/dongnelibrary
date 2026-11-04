/**
 * getLibraryModules() 가 모든 모듈을 내보내는지 확인한다.
 * dlserver 같은 사용처는 이 목록만 쓰므로, 모듈 파일을 만들고 LIBRARY_MODULES 에 넣지 않으면 여기서 실패한다.
 */
const { describe, it } = require("node:test");
const assert = require("assert").strict;
const fs = require("fs");
const path = require("path");
const dl = require("../dist/dongnelibrary");

const MODULE_DIR = path.join(__dirname, "../dist/localLibraryModule");

describe("getLibraryModules", () => {
  it("localLibraryModule 의 모든 모듈을 등록 순서대로 돌려준다", () => {
    const files = fs.readdirSync(MODULE_DIR).filter((f) => f.endsWith(".js"));
    const fromFiles = files.map((f) => require(path.join(MODULE_DIR, f)).moduleName).sort();
    const modules = dl.getLibraryModules();

    assert.deepEqual(modules.map((m) => m.moduleName).sort(), fromFiles);
    assert.deepEqual(modules.map((m) => m.moduleName), dl.getAllModuleNames());
  });

  it("각 모듈은 moduleName·homeUrl·getLibraryNames·search 를 갖는다", () => {
    for (const m of dl.getLibraryModules()) {
      assert.equal(typeof m.moduleName, "string");
      assert.match(m.homeUrl, /^https?:\/\//, `${m.moduleName} homeUrl`);
      assert.ok(m.getLibraryNames().length > 0, `${m.moduleName} 도서관 없음`);
      assert.equal(typeof m.search, "function");
    }
  });

  it("복사본을 돌려주므로 바꿔도 다음 호출에 영향이 없다", () => {
    const first = dl.getLibraryModules();
    first.length = 0;
    assert.equal(dl.getLibraryModules().length, dl.getAllModuleNames().length);
  });

  it("기본 export 에도 있다", () => {
    assert.equal(dl.default.getLibraryModules().length, dl.getAllModuleNames().length);
  });
});
