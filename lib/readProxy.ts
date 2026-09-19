const PROXY_KEY = "runwithme_read_proxy_v1";

export type ReadProxyConfig = {
  url: string;
  token: string;
};

const EMPTY: ReadProxyConfig = { url: "", token: "" };

export function loadReadProxy(): ReadProxyConfig {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(PROXY_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return {
      url:
        typeof parsed?.url === "string" ? parsed.url : "",
      token:
        typeof parsed?.token === "string"
          ? parsed.token
          : "",
    };
  } catch (e) {
    console.error("[readProxy] 加载失败:", e);
    return EMPTY;
  }
}

export function saveReadProxy(
  cfg: ReadProxyConfig
): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(
      PROXY_KEY,
      JSON.stringify(cfg)
    );
    return true;
  } catch (e) {
    console.error("[readProxy] 保存失败:", e);
    return false;
  }
}

export function hasReadProxy(): boolean {
  const c = loadReadProxy();
  return !!c.url.trim() && !!c.token.trim();
}

/** 把 target URL 拼成 worker 调用 URL */
export function buildProxyUrl(
  target: string,
  cfg?: ReadProxyConfig
): string {
  const c = cfg ?? loadReadProxy();
  const base = c.url.trim().replace(/\/+$/, "");
  const params = new URLSearchParams();
  params.set("url", target);
  params.set("token", c.token.trim());
  return `${base}?${params.toString()}`;
}