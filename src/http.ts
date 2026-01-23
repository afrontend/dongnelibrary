import { request } from "undici";
import type { HttpOptions, HttpResponse, HttpSession } from "./types";

const DEFAULT_TIMEOUT = 20000;
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function get(url: string, options: HttpOptions = {}): Promise<HttpResponse> {
  const { qs, headers = {}, timeout = DEFAULT_TIMEOUT } = options;

  let fullUrl = url;
  if (qs && Object.keys(qs).length > 0) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(qs)) {
      params.append(key, String(value));
    }
    fullUrl = `${url}?${params}`;
  }

  const res = await request(fullUrl, {
    method: "GET",
    headersTimeout: timeout,
    bodyTimeout: timeout,
    headers: { "User-Agent": DEFAULT_USER_AGENT, ...headers },
  });

  return { statusCode: res.statusCode, body: await res.body.text() };
}

export async function post(url: string, options: HttpOptions = {}): Promise<HttpResponse> {
  const { form, headers = {}, timeout = DEFAULT_TIMEOUT } = options;

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
  });

  return { statusCode: res.statusCode, body: await res.body.text() };
}

export function createSession(): HttpSession {
  let cookies: string[] = [];

  return {
    async get(url: string, options: HttpOptions = {}): Promise<HttpResponse> {
      const { headers = {}, timeout = DEFAULT_TIMEOUT } = options;

      const res = await request(url, {
        method: "GET",
        headersTimeout: timeout,
        bodyTimeout: timeout,
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          Cookie: cookies.join("; "),
          ...headers,
        },
      });

      const setCookie = res.headers["set-cookie"];
      if (setCookie) {
        const newCookies = Array.isArray(setCookie) ? setCookie : [setCookie];
        cookies = [...cookies, ...newCookies.map((c) => c.split(";")[0])];
      }

      return { statusCode: res.statusCode, body: await res.body.text() };
    },

    async post(url: string, options: HttpOptions = {}): Promise<HttpResponse> {
      const { form, headers = {}, timeout = DEFAULT_TIMEOUT } = options;

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
      });

      return { statusCode: res.statusCode, body: await res.body.text() };
    },
  };
}
