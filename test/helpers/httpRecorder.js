/**
 * 테스트 전용 HTTP 녹화·재생기.
 *
 * 모듈은 모두 undici `request()` 를 쓰고, 일부(siheung, yplib)는 자체 `Agent` 를 넘긴다.
 * `Agent.prototype.dispatch` 를 가로채면 전역 dispatcher 와 자체 Agent 를 함께 잡을 수 있어
 * 모듈 코드를 고치지 않고 응답을 녹화(진단·fixture 생성)하거나 fixture 로 재생(오프라인 테스트)한다.
 */
const { Agent, getGlobalDispatcher, setGlobalDispatcher } = require("undici");

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

// ============================================================================
// Capture
// ============================================================================

function wrapHandler(handler, exchange) {
  const chunks = [];
  const finish = () => {
    Object.assign(exchange, encodeBody(Buffer.concat(chunks)));
    for (const capture of captures) capture.exchanges.push(exchange);
  };

  return new Proxy(handler, {
    get(target, prop) {
      if (prop === "onHeaders") {
        return (statusCode, rawHeaders, resume, statusMessage) => {
          if (statusCode >= 200) {
            exchange.status = statusCode;
            exchange.headers = rawHeaders.map((h) => h.toString("utf8"));
          }
          return target.onHeaders(statusCode, rawHeaders, resume, statusMessage);
        };
      }
      if (prop === "onData") {
        return (chunk) => {
          chunks.push(Buffer.from(chunk));
          return target.onData(chunk);
        };
      }
      if (prop === "onComplete") {
        return (trailers) => {
          finish();
          return target.onComplete(trailers);
        };
      }
      if (prop === "onError") {
        return (err) => {
          exchange.error = err.message;
          finish();
          return target.onError(err);
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

function replayDispatch(opts, handler) {
  const exchange = takeReplay(opts);
  let aborted = null;

  setImmediate(() => {
    try {
      handler.onConnect((reason) => {
        aborted = reason ?? new Error("aborted");
      });
      if (aborted) return handler.onError(aborted);

      if (exchange.status === undefined) {
        return handler.onError(
          new Error(
            exchange.error ??
              `fixture 에 없는 요청: ${exchange.method} ${exchange.url}`,
          ),
        );
      }

      const rawHeaders = (exchange.headers ?? []).map((h) => Buffer.from(h));
      handler.onHeaders(exchange.status, rawHeaders, () => {}, "");
      const body = decodeBody(exchange);
      if (body.length > 0) handler.onData(body);
      handler.onComplete([]);
    } catch (err) {
      handler.onError(err);
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
