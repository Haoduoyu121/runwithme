import {
  extractRegexScripts,
  type RegexScripts,
} from "./regex";

const KEY = "runwithme_ai_presets_v1";
const ACTIVE_KEY = "runwithme_ai_active_preset_v1";

export type PresetPrompt = {
  id: string;
  name: string;
  content: string;
  role: "system" | "user" | "assistant";
  enabled: boolean;
  isMarker: boolean;
  marker?: string;
  orderIndex: number;
};

export type AiPresetParams = {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  min_p?: number;
  top_a?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  repetition_penalty?: number;
  max_tokens?: number;
};

export type AiPreset = {
  id: string;
  name: string;
  params: AiPresetParams;
  prompts: PresetPrompt[];
  regexScripts?: RegexScripts;
  source: "custom" | "sillytavern";
  main_prompt?: string;
  post_history?: string;
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

const KNOWN_MARKERS = new Set([
  "main",
  "chatHistory",
  "worldInfoBefore",
  "worldInfoAfter",
  "charDescription",
  "charPersonality",
  "scenario",
  "dialogueExamples",
  "personaDescription",
  "nsfw",
  "jailbreak",
  "enhanceDefinitions",
  "agentSystemPrompt",
  "agentTask",
  "agentResults",
]);

export function newPreset(): AiPreset {
  return {
    id: genId(),
    name: "新预设",
    params: {
      temperature: 1,
      top_p: 0.9,
      frequency_penalty: 0,
      presence_penalty: 0,
      max_tokens: 512,
    },
    prompts: [
      {
        id: genId(),
        name: "主提示词",
        content:
          "Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}. Stay in character, reply in Chinese.",
        role: "system",
        enabled: true,
        isMarker: false,
        orderIndex: 0,
      },
    ],
    source: "custom",
  };
}

export function loadPresets(): AiPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.map((p: AiPreset) => {
      if (!Array.isArray(p.prompts)) {
        return {
          ...p,
          params: p.params || {},
          prompts: p.main_prompt
            ? [
                {
                  id: genId(),
                  name: "主提示词",
                  content: p.main_prompt,
                  role: "system",
                  enabled: true,
                  isMarker: false,
                  orderIndex: 0,
                },
              ]
            : [],
        };
      }
      return p;
    });
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

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v)
    ? v
    : undefined;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

type STPromptEntry = {
  identifier?: string;
  name?: string;
  content?: string;
  role?: string;
  marker?: boolean;
  system_prompt?: boolean;
};

type STOrderEntry = {
  character_id?: number;
  order?: { enabled: boolean; identifier: string }[];
};

type STPreset = {
  name?: string;
  prompts?: STPromptEntry[];
  prompt_order?: STOrderEntry[];
  temperature?: number;
  top_p?: number;
  top_k?: number;
  min_p?: number;
  top_a?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  repetition_penalty?: number;
  openai_max_tokens?: number;
  openai_max_context?: number;
};

/* ★ 保持同步函数，内部静态 import 正则模块 */
export function parseSillyTavernPreset(
  json: unknown
): AiPreset {
  const j = (json || {}) as STPreset;
  const prompts = Array.isArray(j.prompts) ? j.prompts : [];
  const orders = Array.isArray(j.prompt_order)
    ? j.prompt_order
    : [];

  const activeOrder =
    orders.find((o) => o.character_id === 100001) ||
    orders[0] ||
    null;

  const orderMap = new Map<
    string,
    { enabled: boolean; idx: number }
  >();
  if (activeOrder?.order) {
    activeOrder.order.forEach((o, i) => {
      orderMap.set(o.identifier, {
        enabled: !!o.enabled,
        idx: i,
      });
    });
  }

  const out: PresetPrompt[] = [];
  for (const p of prompts) {
    const id = str(p.identifier);
    if (!id) continue;

    const isMarker =
      !!p.marker || KNOWN_MARKERS.has(id);

    const om = orderMap.get(id);
    if (!om) continue;

    out.push({
      id,
      name: str(p.name) || id,
      content: str(p.content),
      role:
        p.role === "user" || p.role === "assistant"
          ? p.role
          : "system",
      enabled: om.enabled,
      isMarker,
      marker: isMarker ? id : undefined,
      orderIndex: om.idx,
    });
  }

  out.sort((a, b) => a.orderIndex - b.orderIndex);

  const params: AiPresetParams = {
    temperature: num(j.temperature),
    top_p: num(j.top_p),
    top_k: num(j.top_k),
    min_p: num(j.min_p),
    top_a: num(j.top_a),
    frequency_penalty: num(j.frequency_penalty),
    presence_penalty: num(j.presence_penalty),
    repetition_penalty: num(j.repetition_penalty),
    max_tokens: num(j.openai_max_tokens),
  };

  const mainEntry = out.find((x) => x.id === "main");
  const mainPrompt = mainEntry?.content || "";

  const regexScripts = extractRegexScripts(json);

  return {
    id: genId(),
    name: str(j.name) || "导入的预设",
    params,
    prompts: out,
    regexScripts,
    source: "sillytavern",
    main_prompt: mainPrompt,
  };
}

export function applyTemplate(
  text: string,
  vars: { char: string; user: string }
): string {
  return text
    .replace(/\{\{setvar::[^}]*\}\}/gi, "")
    .replace(/\{\{getvar::[^}]*\}\}/gi, "")
    .replace(/\{\{char\}\}/gi, vars.char)
    .replace(/\{\{user\}\}/gi, vars.user)
    .replace(/\{\{persona\}\}/gi, vars.user)
    .trim();
}

export function buildPresetSystemPrompt(
  preset: AiPreset,
  vars: { char: string; user: string }
): string {
  if (!preset) return "";
  const parts: string[] = [];

  const enabled = preset.prompts
    .filter(
      (p) =>
        p.enabled && !p.isMarker && p.content.trim()
    )
    .sort((a, b) => a.orderIndex - b.orderIndex);

  if (enabled.length > 0) {
    for (const p of enabled) {
      const c = applyTemplate(p.content, vars);
      if (c) parts.push(c);
    }
  } else if (preset.main_prompt) {
    parts.push(applyTemplate(preset.main_prompt, vars));
  }

  if (preset.post_history) {
    const c = applyTemplate(preset.post_history, vars);
    if (c) parts.push(c);
  }

  return parts.join("\n\n");
}

export function pickApiParams(preset: AiPreset | null) {
  if (!preset || !preset.params) return {};
  const p = preset.params;
  const out: Record<string, number> = {};
  if (p.temperature !== undefined) out.temperature = p.temperature;
  if (p.top_p !== undefined) out.top_p = p.top_p;
  if (p.top_k !== undefined) out.top_k = p.top_k;
  if (p.min_p !== undefined) out.min_p = p.min_p;
  if (p.top_a !== undefined) out.top_a = p.top_a;
  if (p.frequency_penalty !== undefined)
    out.frequency_penalty = p.frequency_penalty;
  if (p.presence_penalty !== undefined)
    out.presence_penalty = p.presence_penalty;
  if (p.repetition_penalty !== undefined)
    out.repetition_penalty = p.repetition_penalty;
  if (p.max_tokens !== undefined)
    out.max_tokens = Math.min(p.max_tokens, 32000);
  return out;
}