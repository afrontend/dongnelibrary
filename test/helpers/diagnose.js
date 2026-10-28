/**
 * 실제 사이트 테스트가 실패했을 때 원인을 분류하고 응답을 .tmp/test-failures/ 에 남긴다.
 *
 * 분류:
 *   TLS 인증서 · 네트워크 · HTTP 오류 · 차단 의심 · 파서 의심 · 결과 없음
 * "파서 의심" 이면 모듈 코드를, "차단 의심"·"TLS"·"네트워크" 면 사이트 쪽을 먼저 본다.
 */
const fs = require("fs");
const path = require("path");
const { decodeBody } = require("./httpRecorder");

const FAILURE_DIR = path.join(__dirname, "..", "..", ".tmp", "test-failures");

const BLOCK_INDICATORS = [
  "차단",
  "비정상적인 접근",
  "접근이 거부",
  "접근 권한이 없습니다",
  "Access Denied",
  "Forbidden",
  "captcha",
  "The requested URL was rejected",
  "Request Rejected",
];

const TINY_BODY_BYTES = 512;

/**
 * 모듈이 던진 에러 메시지로 원인을 분류한다.
 * @param {string} message
 * @returns {string} "[분류] 메시지"
 */
function classifyError(message = "") {
  const text = String(message);
  if (/certificate|CERT_|SSL|TLS|self[- ]signed/i.test(text)) {
    return `[TLS 인증서] ${text} — 사이트 인증서 체인 문제. 모듈에서 rejectUnauthorized:false Agent 사용을 검토`;
  }
  if (/ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|UND_ERR_.*TIMEOUT|socket|timeout/i.test(text)) {
    return `[네트워크] ${text} — 사이트 접속 불가·지연. 잠시 후 재시도, 계속되면 해외 IP 차단 여부 확인`;
  }
  const status = text.match(/HTTP\s*(\d{3})/i);
  if (status) {
    return `[HTTP 오류 ${status[1]}] ${text} — URL·파라미터 변경 또는 차단`;
  }
  return `[모듈 오류] ${text}`;
}

/**
 * 검색은 성공했는데 결과가 0건일 때 원인을 분류한다.
 * @param {object} result - search 결과 (totalBookCount, booklist)
 * @param {object[]} exchanges - httpRecorder 가 기록한 요청·응답
 * @returns {string}
 */
function classifyEmpty(result, exchanges) {
  const responses = exchanges.filter((e) => e.status !== undefined);
  if (responses.length === 0) {
    return "[요청 없음] 기록된 HTTP 응답이 없다 — 모듈이 요청을 보내지 않았거나 녹화 범위 밖";
  }

  const last = responses[responses.length - 1];
  const body = decodeBody(last);
  const text = body.toString("utf8");
  const where = `${last.method} ${last.url} → ${last.status}, ${body.length} bytes`;

  if (last.status >= 400) {
    return `[HTTP 오류 ${last.status}] ${where}`;
  }
  const blocked = BLOCK_INDICATORS.find((s) => text.includes(s));
  if (blocked) {
    return `[차단 의심] 응답에 "${blocked}" 포함 — ${where}`;
  }
  if (body.length < TINY_BODY_BYTES) {
    return `[차단 의심] 응답이 비정상적으로 작다 — ${where}`;
  }
  if (result && result.totalBookCount > 0) {
    return `[파서 의심] 총 ${result.totalBookCount}권인데 목록 0건 — 목록 선택자가 바뀌었을 수 있다. ${where}`;
  }
  return `[결과 없음] 총 권수도 0 — 실제로 자료가 없거나 총 권수·목록 선택자가 모두 바뀌었다. 저장된 HTML 로 확인. ${where}`;
}

/**
 * 실패한 테스트의 응답을 파일로 남긴다.
 * @param {string} moduleKey - 모듈 파일 이름 (예: "nyj")
 * @param {string} label - 테스트 구분용 이름
 * @param {object[]} exchanges
 * @returns {string|null} 저장한 디렉터리 (응답이 없으면 null)
 */
function saveFailure(moduleKey, label, exchanges) {
  if (exchanges.length === 0) return null;

  const dir = path.join(FAILURE_DIR, moduleKey, label.replace(/[^\w가-힣-]+/g, "_"));
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  exchanges.forEach((e, i) => {
    const ext = /json/i.test(String(e.headers)) ? "json" : "html";
    if (e.status !== undefined) {
      fs.writeFileSync(path.join(dir, `${i + 1}.${ext}`), decodeBody(e));
    }
  });
  const meta = exchanges.map(({ body, ...rest }) => rest);
  fs.writeFileSync(path.join(dir, "requests.json"), JSON.stringify(meta, null, 2));

  return path.relative(process.cwd(), dir);
}

module.exports = { classifyError, classifyEmpty, saveFailure };
