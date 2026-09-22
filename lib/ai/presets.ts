const KEY = "runwithme_ai_presets_v1";
const ACTIVE_KEY = "runwithme_ai_active_preset_v1";

export type AiPreset = {
  id: string;
  name: string;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  max_tokens?: number;
  main_prompt: string;
  post_history: string;
  source?: "custom" | "sillytavern";
};

function genId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return (
    "ps-" +
    Date.now() +
    "-" +
    Math.random().toString(36).slice(2, 8)
  );
}

export function newPreset(): AiPreset {
  return {
    id: genId(),
    name: "新预设",
    temperature: 1,
    top_p: 0.9,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 512,
    main_prompt:
      "Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}. Stay in character, reply in Chinese.",
    post_history: "",
    source: "custom",
  };
}

export function loadPresets(): AiPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function savePresets(list: AiPreset[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function getActivePresetId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(ACTIVE_KEY) || "";
}

export function setActivePresetId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_KEY, id);
}

/* ---------- SillyTavern 预设解析 ---------- */

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v)
    ? v
    : undefined;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function parseSillyTavernPreset(
  json: unknown
): AiPreset {
  const j = (json || {}) as Record<string, unknown>;
  const main =
    str(j.main_prompt) ||
    str(j.system_prompt) ||
    str(j.new_chat_prompt) ||
    "";
  return {
    id: genId(),
    name: str(j.name) || str(j.preset_name) || "导入的预设",
    temperature: num(j.temperature ?? j.temp),
    top_p: num(j.top_p),
    frequency_penalty: num(j.frequency_penalty),
    presence_penalty: num(j.presence_penalty),
    max_tokens: num(
      j.max_tokens ?? j.openai_max_tokens ?? j.openai_max
    ),
    main_prompt: main,
    post_history: str(j.post_history_instructions),
    source: "sillytavern",
  };
}

/* ---------- 模板变量替换 ---------- */

export function applyTemplate(
  text: string,
  vars: { char: string; user: string }
): string {
  return text
    .replace(/\{\{char\}\}/gi, vars.char)
    .replace(/\{\{user\}\}/gi, vars.user);
}