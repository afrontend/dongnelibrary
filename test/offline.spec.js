/**
 * 녹화된 응답(test/fixtures/*.json)으로 모듈 파서를 검증하는 오프라인 테스트.
 * 네트워크를 쓰지 않으므로 빠르고, 사이트 상태와 무관하게 결과가 같다.
 *
 * - 여기서 실패하면: 모듈 코드(파서)가 바뀌어 예전 응답을 다르게 읽는다.
 * - 여기는 통과하는데 <모듈>.spec.js 가 실패하면: 사이트가 바뀌었다.
 *
 * 사이트가 바뀌어 모듈을 고쳤다면 `npm run record -- <모듈>` 로 fixture 를 다시 만든다.
 *
 * fixture 는 사이트 응답(세션 쿠키 포함)을 그대로 담으므로 커밋하지 않는다(.gitignore).
 * 기본 위치는 test/fixtures/, 환경변수 DONGNE_FIXTURE_DIR 로 바꿀 수 있다.
 * fixture 가 없으면(CI, 새 머신) 이 테스트는 건너뛴다.
 */
const { describe, it } = require("node:test");
const assert = require("assert").strict;
const fs = require("fs");
const path = require("path");
const { startReplay, stopReplay } = require("./helpers/httpRecorder");

const FIXTURE_DIR = process.env.DONGNE_FIXTURE_DIR ?? path.join(__dirname, "fixtures");

function normalize(result) {
  return JSON.parse(
    JSON.stringify({
      totalBookCount: result.totalBookCount,
      booklist: result.booklist,
    }),
  );
}

const fixtureFiles = fs.existsSync(FIXTURE_DIR)
  ? fs.readdirSync(FIXTURE_DIR).filter((f) => f.endsWith(".json")).sort()
  : [];

describe("오프라인 파서 테스트 (fixture 재생)", () => {
  if (fixtureFiles.length === 0) {
    it("fixture 없음", { skip: `${FIXTURE_DIR} 에 fixture 가 없다 — npm run record -- <모듈> 로 만든다` }, () => {});
  }

  for (const file of fixtureFiles) {
    const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, file), "utf8"));
    const lib = require(`../dist/localLibraryModule/${fixture.module}`);

    describe(`${fixture.module} ${fixture.moduleName} (녹화 ${fixture.recordedAt})`, () => {
      for (const c of fixture.cases) {
        it(`${c.name}: "${c.options.title.slice(0, 20)}" @ ${c.options.libraryName}`, async () => {
          startReplay(c.exchanges);
          try {
            const result = normalize(await lib.search(c.options));
            const hint = `다시 녹화하려면: npm run record -- ${fixture.module}`;
            assert.equal(
              result.totalBookCount,
              c.expected.totalBookCount,
              `총 권수가 녹화 때와 다르다. ${hint}`,
            );
            assert.deepEqual(
              result.booklist,
              c.expected.booklist,
              `목록이 녹화 때와 다르다. ${hint}`,
            );
          } finally {
            stopReplay();
          }
        });
      }
    });
  }
});
