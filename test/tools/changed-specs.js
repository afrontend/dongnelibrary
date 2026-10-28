#!/usr/bin/env node
/**
 * 실제 사이트 테스트(test/<모듈>.spec.js) 중 이번 변경과 관련된 것만 골라 출력한다.
 * GitHub Actions 에서 push·PR 마다 바뀐 모듈만 실제 사이트로 확인할 때 쓴다.
 *
 *   node test/tools/changed-specs.js --base <git ref>     # base 이후 바뀐 모듈
 *   node test/tools/changed-specs.js --modules all        # 모든 모듈
 *   node test/tools/changed-specs.js --modules nyj,ulju   # 지정한 모듈
 *
 * 다음 파일이 바뀌면 해당 모듈의 spec 을 고른다:
 *   src/localLibraryModule/<모듈>.ts · test/<모듈>.spec.js
 * 공통 코드(http.ts, util.ts, 테스트 헬퍼 등)만 바뀌면 아무것도 고르지 않는다.
 * 그 영향은 로컬 오프라인 테스트와 월간 전체 실행이 맡는다.
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
  const args = { base: null, modules: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--base") args.base = argv[++i];
    else if (argv[i] === "--modules") args.modules = argv[++i];
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

function main() {
  const args = parseArgs(process.argv.slice(2));
  let modules;
  if (args.modules) {
    modules =
      args.modules.trim() === "all"
        ? allModules()
        : args.modules.split(/[\s,]+/).filter(Boolean);
  } else if (args.base) {
    modules = modulesFromFiles(changedFiles(args.base));
  } else {
    console.error("사용법: changed-specs.js --base <git ref> | --modules all|<모듈,...>");
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
