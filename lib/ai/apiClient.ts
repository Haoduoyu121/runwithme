const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://api.yulewin.cn";

const KEY = "runwithme_ai_api_v1";

export type AiApiConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export function loadConfig(): AiApiConfig {
  if (typeof window === "undefined")
    return { baseUrl: "", apiKey: "", model: "" };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      baseUrl: raw.baseUrl || "",
      apiKey: raw.apiKey || "",
      model: raw.model || "",
    };
  } catch {
    return { baseUrl: "", apiKey: "", model: "" };
  }
}

export function saveConfig(c: AiApiConfig) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(c));
}

export async function fetchModels(
  baseUrl: string,
  apiKey: string
): Promise<string[]> {
  const r = await fetch(`${API_BASE}/api/ai/models`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ baseUrl, apiKey }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  const list = data.data || data.models || [];
  return list
    .map((m: { id?: string }) => m.id)
    .filter((x: unknown): x is string => typeof x === "string");
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function* streamChat(
  cfg: AiApiConfig,
  messages: ChatMessage[],
  params?: Record<string, unknown>
): AsyncGenerator<string, void, void> {
  const r = await fetch(`${API_BASE}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      baseUrl: cfg.baseUrl,
      apiKey: cfg.apiKey,
      payload: {
        model: cfg.model,
        messages,
        ...params,
      },
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t.slice(0, 300));
  }
  if (!r.body) throw new Error("无响应流");
  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta) yield delta;
      } catch {
        /* skip bad line */
      }
    }
  }
}