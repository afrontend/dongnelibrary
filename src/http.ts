import tls from "node:tls";
import { Agent, request } from "undici";
import type { HttpOptions, HttpResponse, HttpSession } from "./types";

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// 서버가 중간 인증서를 빠뜨리거나 잘못 보낼 때 나는 오류
const CHAIN_ERRORS = new Set([
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
]);

const extraCaAgents = new Map<string, Agent>();

// 기본 신뢰 목록에 extraCa 를 더한 Agent. ca 를 주면 기본 목록이 대체되므로
// 기본 목록을 함께 넣는다. getCACertificates (Node 22.15+) 는
// NODE_EXTRA_CA_CERTS 까지 포함하고, 없는 버전은 내장 루트만 쓴다.
function agentWithExtraCa(extraCa: string): Agent {
  let agent = extraCaAgents.get(extraCa);
  if (!agent) {
    const { getCACertificates } = tls as {
      getCACertificates?: (type: "default") => string[];
    };
    const base = getCACertificates?.("default") ?? tls.rootCertificates;
    agent = new Agent({ connect: { ca: [...base, extraCa] } });
    extraCaAgents.set(extraCa, agent);
  }
  return agent;
}

// 체인 오류가 한 번 난 호스트. 이후 요청은 기본 접속을 건너뛰어
// 실패하는 TLS 연결이 요청마다 하나씩 늘지 않게 한다 (느린 서버는 접속이 몰리면 막힌다)
const brokenChainHosts = new Set<string>();

// 평소대로 요청하고, 인증서 체인 오류가 나고 extraCa 가 있을 때만 다시 요청한다
export async function requestWithExtraCa(
  url: string,
  opts: Parameters<typeof request>[1],
  extraCa?: string,
) {
  const host = new URL(url).host;
  if (extraCa && brokenChainHosts.has(host)) {
    return request(url, { ...opts, dispatcher: agentWithExtraCa(extraCa) });
  }
  try {
    return await request(url, opts);
  } catch (err) {
    const code =
      (err as { code?: string }).code ??
      (err as { cause?: { code?: string } }).cause?.code;
    if (!extraCa || !code || !CHAIN_ERRORS.has(code)) throw err;
    brokenChainHosts.add(host);
    return request(url, { ...opts, dispatcher: agentWithExtraCa(extraCa) });
  }
}

export async function get(
  url: string,
  options: HttpOptions = {},
): Promise<HttpResponse> {
  const {
    qs,
    headers = {},
    timeout = DEFAULT_TIMEOUT,
    signal,
    extraCa,
  } = options;

  let fullUrl = url;
  if (qs && Object.keys(qs).length > 0) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(qs)) {
      params.append(key, String(value));
    }
    fullUrl = `${url}?${params}`;
  }

  const res = await requestWithExtraCa(
    fullUrl,
    {
      method: "GET",
      headersTimeout: timeout,
      bodyTimeout: timeout,
      headers: { "User-Agent": DEFAULT_USER_AGENT, ...headers },
      signal,
    },
    extraCa,
  );

  return { statusCode: res.statusCode, body: await res.body.text() };
}

export async function post(
  url: string,
  options: HttpOptions = {},
): Promise<HttpResponse> {
  const { form, headers = {}, timeout = DEFAULT_TIMEOUT, signal } = options;

  const formData = new URLSearchParams();
  if (form) {
    for (const [key, value] of Object.entries(form)) {
      formData.append(key, String(value));
    }
  }

  const res = await request(url, {
    method: "POST",
    headersTimeout: timeout,
    bodyTimeout: timeout,
    headers: {
      "User-Agent": DEFAULT_USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
      ...headers,
    },
    body: formData.toString(),
    signal,
  });

  return { statusCode: res.statusCode, body: await res.body.text() };
}

export function createSession(): HttpSession {
  let cookies: string[] = [];

  return {
    async get(url: string, options: HttpOptions = {}): Promise<HttpResponse> {
      const { headers = {}, timeout = DEFAULT_TIMEOUT, signal } = options;

      const res = await request(url, {
        method: "GET",
        headersTimeout: timeout,
        bodyTimeout: timeout,
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          Cookie: cookies.join("; "),
          ...headers,
        },
        signal,
      });

      const setCookie = res.headers["set-cookie"];
      if (setCookie) {
        const newCookies = Array.isArray(setCookie) ? setCookie : [setCookie];
        cookies = [...cookies, ...newCookies.map((c) => c.split(";")[0])];
      }

      return { statusCode: res.statusCode, body: await res.body.text() };
    },

    async post(url: string, options: HttpOptions = {}): Promise<HttpResponse> {
      const { form, headers = {}, timeout = DEFAULT_TIMEOUT, signal } = options;

      const formData = new URLSearchParams();
      if (form) {
        for (const [key, value] of Object.entries(form)) {
          formData.append(key, String(value));
        }
      }

      const res = await request(url, {
        method: "POST",
        headersTimeout: timeout,
        bodyTimeout: timeout,
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookies.join("; "),
          ...headers,
        },
        body: formData.toString(),
        signal,
      });

      return { statusCode: res.statusCode, body: await res.body.text() };
    },
  };
}
