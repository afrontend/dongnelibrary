#!/usr/bin/env node
/**
 * 실제 사이트 응답을 녹화해 오프라인 테스트용 fixture(test/fixtures/<모듈>.json)를 만든다.
 *
 *   npm run record -- <모듈> [--library 도서관이름] [--term 검색어]
 *
 * 녹화하는 경우:
 *   found - 검색어 후보 중 책이 나오는 첫 검색 (파서가 목록을 제대로 읽는지)
 *   empty - 말이 안 되는 제목 검색 (결과 0건 처리가 맞는지)
 *
 * 책이 하나도 안 나오면 깨진 상태를 녹화하지 않도록 진단만 출력하고 실패한다.
 *
 * fixture 는 커밋하지 않는다(.gitignore). 저장 위치는 환경변수 DONGNE_FIXTURE_DIR 로 바꿀 수 있다.
 */
const fs = require("fs");
const path = require("path");
const { startCapture } = require("../helpers/httpRecorder");
const { classifyError, classifyEmpty } = require("../helpers/diagnose");
const { getSearchTerms } = require("../helpers/searchTerms");

const ROOT = path.join(__dirname, "..", "..");
const FIXTURE_DIR = process.env.DONGNE_FIXTURE_DIR ?? path.join(ROOT, "test", "fixtures");
const NONSENSE_TITLE = "zyxwvutsrqponmlkjihgfedcbaabcdefghijklmnopqrstuvwxyz";

function parseArgs(argv) {
  const args = { module: null, library: null, term: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--library") args.library = argv[++i];
    else if (argv[i] === "--term") args.term = argv[++i];
    else if (!args.module) args.module = argv[i];
  }
  return args;
}

// 결과 비교에 쓰므로 undefined 필드를 없앤 JSON 형태로 맞춘다.
function normalize(result) {
  return JSON.parse(
    JSON.stringify({
      totalBookCount: result.totalBookCount,
      booklist: result.booklist,
    }),
  );
}

async function recordCase(lib, name, options) {
  const capture = startCapture();
  try {
    const result = await lib.search(options);
    return { name, options, result, exchanges: capture.stop() };
  } catch (error) {
    return { name, options, error, exchanges: capture.stop() };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.module) {
    console.error("사용법: npm run record -- <모듈> [--library 도서관이름] [--term 검색어]");
    process.exit(2);
  }

  const modulePath = path.join(ROOT, "dist", "localLibraryModule", `${args.module}.js`);
  if (!fs.existsSync(modulePath)) {
    console.error(`모듈 없음: ${modulePath} (npm run build 를 먼저 실행)`);
    process.exit(2);
  }
  const lib = require(modulePath);
  const libraryName = args.library ?? lib.getLibraryNames()[0];
  const terms = args.term ? [args.term] : getSearchTerms();

  let found = null;
  for (const title of terms) {
    const recorded = await recordCase(lib, "found", { title, libraryName, startPage: 1 });
    if (recorded.error) {
      console.error(`✗ "${title}": ${classifyError(recorded.error.message)}`);
      process.exit(1);
    }
    if (recorded.result.booklist.length > 0) {
      found = recorded;
      break;
    }
    console.log(`- "${title}": ${classifyEmpty(recorded.result, recorded.exchanges)}`);
  }
  if (!found) {
    console.error(`✗ ${libraryName}: 책이 나오는 검색어가 없어 녹화하지 않았다.`);
    process.exit(1);
  }

  const cases = [found];
  const empty = await recordCase(lib, "empty", {
    title: NONSENSE_TITLE,
    libraryName,
    startPage: 1,
  });
  if (empty.error) {
    console.warn(`! empty 녹화 생략: ${classifyError(empty.error.message)}`);
  } else {
    cases.push(empty);
  }

  const fixture = {
    module: args.module,
    moduleName: lib.moduleName,
    recordedAt: new Date().toISOString().slice(0, 10),
    cases: cases.map(({ name, options, result, exchanges }) => ({
      name,
      options,
      expected: normalize(result),
      exchanges,
    })),
  };

  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  const file = path.join(FIXTURE_DIR, `${args.module}.json`);
  fs.writeFileSync(file, `${JSON.stringify(fixture, null, 2)}\n`);

  const size = (fs.statSync(file).size / 1024).toFixed(0);
  for (const c of fixture.cases) {
    console.log(
      `✓ ${c.name}: "${c.options.title.slice(0, 20)}" @ ${libraryName} → ` +
        `${c.expected.booklist.length}건 (총 ${c.expected.totalBookCount}), 요청 ${c.exchanges.length}개`,
    );
  }
  console.log(`저장: ${path.relative(process.cwd(), file)} (${size} KB)`);
}

main();
