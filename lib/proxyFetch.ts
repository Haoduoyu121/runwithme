/**
 * 网络请求工具：直连优先，失败自动走代理
 *
 * 从 lib/legado 抽出，RSS / OPDS 都用它。
 */

import {
  buildProxyUrl,
  hasReadProxy,
} from "@/lib/readProxy";

export type FetchHtmlOptions = {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

export type FetchHtmlResult = {
  html: string;
  viaProxy: boolean;
  finalUrl: string;
  status: number;
};

const MAX_FETCH_BYTES = 20 * 1024 * 1024;

async function doFetch(
  url: string,
  opts: FetchHtmlOptions
): Promise<Response> {
  const init: RequestInit = {
    method: opts.method ?? "GET",
    headers: {
      ...(opts.headers ?? {}),
    },
    redirect: "follow",
  };

  if (
    opts.body &&
    (init.method ?? "GET").toUpperCase() !== "GET"
  ) {
    init.body = opts.body;
    const h = init.headers as Record<string, string>;
    if (!h["Content-Type"] && !h["content-type"]) {
      h["Content-Type"] =
        "application/x-www-form-urlencoded";
    }
  }

  const controller = new AbortController();
  const timer = opts.timeoutMs
    ? window.setTimeout(
        () => controller.abort(),
        opts.timeoutMs
      )
    : null;

  init.signal = controller.signal;

  try {
    return await fetch(url, init);
  } finally {
    if (timer !== null) {
      window.clearTimeout(timer);
    }
  }
}

export async function fetchHtml(
  url: string,
  opts: FetchHtmlOptions = {}
): Promise<FetchHtmlResult> {
  let lastErr: unknown = null;

  try {
    const res = await doFetch(url, opts);

    const lenHeader = res.headers.get("content-length");
    if (lenHeader) {
      const n = Number(lenHeader);
      if (
        Number.isFinite(n) &&
        n > MAX_FETCH_BYTES
      ) {
        throw new Error("响应太大（超过 20MB）");
      }
    }

    if (res.ok) {
      const html = await res.text();
      if (html && html.length >= 30) {
        return {
          html,
          viaProxy: false,
          finalUrl: res.url || url,
          status: res.status,
        };
      }
      lastErr = new Error("内容为空或太短");
    } else {
      lastErr = new Error(`HTTP ${res.status}`);
    }
  } catch (e) {
    lastErr = e;
  }

  if (hasReadProxy()) {
    const proxyUrl = buildProxyUrl(url);
    const proxyRes = await doFetch(proxyUrl, opts);

    if (!proxyRes.ok) {
      throw new Error(
        `代理返回 ${proxyRes.status}` +
          (proxyRes.status === 403
            ? "（token 不对？）"
            : "")
      );
    }

    const html = await proxyRes.text();
    if (!html || html.length < 30) {
      throw new Error("代理返回内容为空或太短");
    }
    return {
      html,
      viaProxy: true,
      finalUrl: url,
      status: proxyRes.status,
    };
  }

  if (lastErr instanceof Error) {
    throw new Error(
      `${lastErr.message}（未配置代理，无法绕过 CORS）`
    );
  }
  throw new Error("无法获取内容");
}
/* =========================================================
   fetchBlob —— 二进制版本（EPUB / 封面图）
   ========================================================= */

export async function fetchBlob(
  url: string,
  opts: FetchHtmlOptions = {}
): Promise<{
  blob: Blob;
  viaProxy: boolean;
  finalUrl: string;
  status: number;
}> {
  let lastErr: unknown = null;

  try {
    const res = await doFetch(url, opts);
    if (res.ok) {
      const blob = await res.blob();
      if (blob && blob.size > 0) {
        return {
          blob,
          viaProxy: false,
          finalUrl: res.url || url,
          status: res.status,
        };
      }
      lastErr = new Error("内容为空");
    } else {
      lastErr = new Error(`HTTP ${res.status}`);
    }
  } catch (e) {
    lastErr = e;
  }

  if (hasReadProxy()) {
    const proxyUrl = buildProxyUrl(url);
    const proxyRes = await doFetch(proxyUrl, opts);

    if (!proxyRes.ok) {
      throw new Error(
        `代理返回 ${proxyRes.status}` +
          (proxyRes.status === 403
            ? "（token 不对？）"
            : "")
      );
    }

    const blob = await proxyRes.blob();
    if (!blob || blob.size === 0) {
      throw new Error("代理返回内容为空");
    }
    return {
      blob,
      viaProxy: true,
      finalUrl: url,
      status: proxyRes.status,
    };
  }

  if (lastErr instanceof Error) {
    throw new Error(
      `${lastErr.message}（未配置代理，无法绕过 CORS）`
    );
  }
  throw new Error("无法获取内容");
}