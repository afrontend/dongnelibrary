#!/usr/bin/env node
/**
 * 실제 사이트 테스트(test/<모듈>.spec.js) 중 이번 변경과 관련된 것만 골라 출력한다.
 * GitHub Actions 에서 push·PR 마다 바뀐 모듈만 실제 사이트로 확인할 때 쓴다.
 *
 *   node test/tools/changed-specs.js --base <git ref>     # base 이후 바뀐 모듈
 *   node test/tools/changed-specs.js --modules all        # 모든 모듈
 *   node test/tools/changed-specs.js --modules nyj,ulju   # 지정한 모듈
 *   node test/tools/changed-specs.js --rotate 10          # 이번 차례의 10개 묶음 (모듈 상태 점검)
 *   node test/tools/changed-specs.js --rotate 10 --round 3
 *
 * 다음 파일이 바뀌면 해당 모듈의 spec 을 고른다:
 *   src/localLibraryModule/<모듈>.ts · test/<모듈>.spec.js
 * 공통 코드(http.ts, util.ts, 테스트 헬퍼 등)만 바뀌면 아무것도 고르지 않는다.
 * 그 영향은 로컬 오프라인 테스트와 모듈 상태 점검(2주마다 묶음 실행)이 맡는다.
 *
 * --rotate: 모듈을 이름순으로 size 개씩 묶고 round 번째 묶음(나머지 연산)을 고른다.
 * round 를 주지 않으면 날짜로 정한다: 반달(1~14일, 15일~)마다 1씩 늘어
 * 매월 1일·15일 실행이 묶음을 차례로 돈다.
 *
 * 출력: spec 경로를 한 줄에 하나씩. 고를 것이 없으면 빈 출력.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..", "..");
const MODULE_DIR = path.join(ROOT, "src", "localLibraryModule");

const CHANGED_FILE_PATTERNS = [
  /^src\/localLibraryModule\/([\w-]+)\.ts$/,
  /^test\/([\w-]+)\.spec\.js$/,
];

function parseArgs(argv) {
  const args = { base: null, modules: null, rotate: null, round: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--base") args.base = argv[++i];
    else if (argv[i] === "--modules") args.modules = argv[++i];
    else if (argv[i] === "--rotate") args.rotate = Number(argv[++i]);
    else if (argv[i] === "--round") args.round = Number(argv[++i]);
  }
  return args;
}

function allModules() {
  return fs
    .readdirSync(MODULE_DIR)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => path.basename(f, ".ts"));
}

function changedFiles(base) {
  const output = execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return output.split("\n").filter(Boolean);
}

function modulesFromFiles(files) {
  const modules = new Set();
  for (const file of files) {
    for (const pattern of CHANGED_FILE_PATTERNS) {
      const match = file.match(pattern);
      if (match) modules.add(match[1]);
    }
  }
  return [...modules];
}

// 1970년 1월부터 센 반달 번호 (UTC)
function halfMonthRound(date = new Date()) {
  return (
    (date.getUTCFullYear() - 1970) * 24 +
    date.getUTCMonth() * 2 +
    (date.getUTCDate() >= 15 ? 1 : 0)
  );
}

function rotateModules(size, round) {
  const modules = allModules().sort();
  const batches = Math.ceil(modules.length / size);
  const index = ((round % batches) + batches) % batches;
  console.error(`묶음 ${index + 1}/${batches} (round ${round})`);
  return modules.slice(index * size, (index + 1) * size);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  let modules;
  if (args.rotate) {
    if (!Number.isInteger(args.rotate) || args.rotate < 1) {
      console.error("--rotate 는 1 이상의 정수여야 한다");
      process.exit(2);
    }
    const round = args.round ?? halfMonthRound();
    if (!Number.isInteger(round)) {
      console.error("--round 는 정수여야 한다");
      process.exit(2);
    }
    modules = rotateModules(args.rotate, round);
  } else if (args.modules) {
    modules =
      args.modules.trim() === "all"
        ? allModules()
        : args.modules.split(/[\s,]+/).filter(Boolean);
  } else if (args.base) {
    modules = modulesFromFiles(changedFiles(args.base));
  } else {
    console.error(
      "사용법: changed-specs.js --base <git ref> | --modules all|<모듈,...> | --rotate <개수> [--round <번호>]",
    );
    process.exit(2);
  }

  const known = new Set(allModules());
  const specs = modules
    .filter((m) => known.has(m))
    .map((m) => `test/${m}.spec.js`)
    .filter((spec) => fs.existsSync(path.join(ROOT, spec)))
    .sort();

  const unknown = modules.filter((m) => !known.has(m));
  if (args.modules && unknown.length > 0) {
    console.error(`모르는 모듈: ${unknown.join(", ")}`);
    process.exit(2);
  }

  if (specs.length > 0) console.log(specs.join("\n"));
}

main();
