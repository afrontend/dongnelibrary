/**
 * 테스트 전용 HTTP 녹화·재생기.
 *
 * 모듈은 모두 undici `request()` 를 쓰고, 일부(siheung, yplib)는 자체 `Agent` 를 넘긴다.
 * `Agent.prototype.dispatch` 를 가로채면 전역 dispatcher 와 자체 Agent 를 함께 잡을 수 있어
 * 모듈 코드를 고치지 않고 응답을 녹화(진단·fixture 생성)하거나 fixture 로 재생(오프라인 테스트)한다.
 */
const {
  Agent,
  getGlobalDispatcher,
  setGlobalDispatcher,
  util,
} = require("undici");

const originalDispatch = Agent.prototype.dispatch;

let mode = "off"; // "off" | "capture" | "replay"
const captures = new Set();
let replayQueue = [];

// ============================================================================
// Encoding helpers
// ============================================================================

function encodeBody(buffer) {
  const text = buffer.toString("utf8");
  if (Buffer.from(text, "utf8").equals(buffer)) {
    return { body: text, bodyEncoding: "utf8" };
  }
  return { body: buffer.toString("base64"), bodyEncoding: "base64" };
}

function decodeBody(exchange) {
  return Buffer.from(exchange.body ?? "", exchange.bodyEncoding ?? "utf8");
}

function requestUrl(opts) {
  return new URL(opts.path, String(opts.origin)).toString();
}

function requestBody(opts) {
  if (opts.body == null) return null;
  if (typeof opts.body === "string") return opts.body;
  if (Buffer.isBuffer(opts.body)) return opts.body.toString("utf8");
  return null;
}

// HTTP/1.1 은 [이름, 값, ...] Buffer 배열, HTTP/2 는 { 이름: 값 | 값[] } 객체를 준다.
// fixture 에는 둘 다 [이름, 값, ...] 문자열 배열로 저장한다.
function rawHeaderStrings(raw) {
  if (Array.isArray(raw)) return raw.map((h) => h.toString("utf8"));
  return Object.entries(raw ?? {}).flatMap(([name, value]) =>
    (Array.isArray(value) ? value : [value]).flatMap((v) => [name, String(v)]),
  );
}

// ============================================================================
// Capture
// ============================================================================

function wrapHandler(handler, exchange) {
  const chunks = [];
  const finish = () => {
    Object.assign(exchange, encodeBody(Buffer.concat(chunks)));
    for (const capture of captures) capture.exchanges.push(exchange);
  };

  // undici 7+ 핸들러 API (onResponseStart·onResponseData·onResponseEnd·onResponseError)
  return new Proxy(handler, {
    get(target, prop) {
      if (prop === "onResponseStart") {
        return (controller, statusCode, headers, statusMessage) => {
          if (statusCode >= 200) {
            exchange.status = statusCode;
            exchange.headers = rawHeaderStrings(controller?.rawHeaders ?? headers);
          }
          return target.onResponseStart?.(controller, statusCode, headers, statusMessage);
        };
      }
      if (prop === "onResponseData") {
        return (controller, chunk) => {
          chunks.push(Buffer.from(chunk));
          return target.onResponseData?.(controller, chunk);
        };
      }
      if (prop === "onResponseEnd") {
        return (controller, trailers) => {
          finish();
          return target.onResponseEnd?.(controller, trailers);
        };
      }
      if (prop === "onResponseError") {
        return (controller, err) => {
          exchange.error = err.message;
          finish();
          return target.onResponseError?.(controller, err);
        };
      }
      const value = target[prop];
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

// ============================================================================
// Replay
// ============================================================================

function takeReplay(opts) {
  const method = opts.method ?? "GET";
  const url = requestUrl(opts);
  const body = requestBody(opts);

  // 1) method + URL + body 가 같은 것 → 2) 쿼리를 뺀 경로가 같은 것 (세션 토큰·타임스탬프 대비)
  let index = replayQueue.findIndex(
    (e) => e.method === method && e.url === url && (e.requestBody ?? null) === body,
  );
  if (index === -1) {
    const { origin, pathname } = new URL(url);
    index = replayQueue.findIndex((e) => {
      const recorded = new URL(e.url);
      return (
        e.method === method &&
        recorded.origin === origin &&
        recorded.pathname === pathname
      );
    });
  }
  if (index === -1) return { method, url };
  return replayQueue.splice(index, 1)[0];
}

// undici 핸들러에 넘기는 controller. 재생은 한 번에 끝나므로 pause·resume 은 할 일이 없다
class ReplayController {
  rawHeaders = null;
  aborted = false;
  reason = null;
  paused = false;

  constructor(onAbort) {
    this.onAbort = onAbort;
  }

  pause() {}

  resume() {}

  abort(reason) {
    if (this.aborted) return;
    this.aborted = true;
    this.reason = reason ?? new Error("aborted");
    this.onAbort(this.reason);
  }
}

function replayDispatch(opts, handler) {
  const exchange = takeReplay(opts);
  let done = false;
  const fail = (err) => {
    if (done) return;
    done = true;
    handler.onResponseError?.(controller, err);
  };
  const controller = new ReplayController(fail);

  setImmediate(() => {
    try {
      handler.onRequestStart?.(controller, {});
      if (done) return;

      if (exchange.status === undefined) {
        return fail(
          new Error(
            exchange.error ??
              `fixture 에 없는 요청: ${exchange.method} ${exchange.url}`,
          ),
        );
      }

      const rawHeaders = (exchange.headers ?? []).map((h) => Buffer.from(h));
      controller.rawHeaders = rawHeaders;
      handler.onResponseStart?.(
        controller,
        exchange.status,
        util.parseHeaders(rawHeaders),
        "",
      );
      const body = decodeBody(exchange);
      if (!done && body.length > 0) handler.onResponseData?.(controller, body);
      if (!done) {
        done = true;
        handler.onResponseEnd?.(controller, {});
      }
    } catch (err) {
      fail(err);
    }
  });
  return true;
}

// ============================================================================
// Public API
// ============================================================================

Agent.prototype.dispatch = function dispatch(opts, handler) {
  if (mode === "replay") return replayDispatch(opts, handler);
  if (mode === "capture" && captures.size > 0) {
    const exchange = {
      method: opts.method ?? "GET",
      url: requestUrl(opts),
      requestBody: requestBody(opts),
    };
    return originalDispatch.call(this, opts, wrapHandler(handler, exchange));
  }
  return originalDispatch.call(this, opts, handler);
};

// 전역 dispatcher 가 Node 내장 undici 의 Agent 이면 위 패치가 닿지 않으므로 npm undici 의 Agent 로 맞춘다.
if (!(getGlobalDispatcher() instanceof Agent)) {
  setGlobalDispatcher(new Agent());
}

/**
 * 실제 네트워크 요청을 그대로 보내면서 응답을 기록한다.
 * @returns {{ stop: () => object[] }} stop() 은 그동안의 요청·응답 목록을 돌려준다.
 */
function startCapture() {
  mode = "capture";
  const capture = { exchanges: [] };
  captures.add(capture);
  return {
    stop() {
      captures.delete(capture);
      return capture.exchanges;
    },
  };
}

/**
 * 네트워크 대신 기록된 요청·응답으로 응답한다. 한 번 쓴 응답은 다시 쓰지 않는다.
 * @param {object[]} exchanges - startCapture().stop() 이 돌려준 목록
 */
function startReplay(exchanges) {
  mode = "replay";
  replayQueue = exchanges.map((e) => ({ ...e }));
}

function stopReplay() {
  mode = "capture";
  replayQueue = [];
}

module.exports = { startCapture, startReplay, stopReplay, decodeBody };
