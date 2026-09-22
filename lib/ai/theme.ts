export type AiThemeId = "library" | "archive" | "tram";

const THEME_KEY = "runwithme_ai_theme_v1";
const CUSTOM_KEY = "runwithme_ai_theme_custom_v1";

export const THEMES: {
  id: AiThemeId;
  name: string;
  desc: string;
  swatch: string[];
}[] = [
  {
    id: "library",
    name: "图书馆",
    desc: "羊皮纸 · 安静",
    swatch: ["#f4ecd8", "#8b6b3d"],
  },
  {
    id: "archive",
    name: "档案室",
    desc: "冷光 · 虚空",
    swatch: ["#0e1014", "#5b8ff9"],
  },
  {
    id: "tram",
    name: "午夜电车",
    desc: "旅途 · 暖黄",
    swatch: ["#0f1a2e", "#f5a623"],
  },
];

export function loadTheme(): AiThemeId {
  if (typeof window === "undefined") return "library";
  const v = localStorage.getItem(THEME_KEY);
  if (v === "library" || v === "archive" || v === "tram")
    return v;
  return "library";
}

export function saveTheme(id: AiThemeId) {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_KEY, id);
}

export type CustomVars = {
  bg?: string;
  surface?: string;
  text?: string;
  accent?: string;
  font?: string;
  radius?: string;
};

export function loadCustom(): CustomVars {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveCustom(v: CustomVars) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(v));
}

export function toStyle(v: CustomVars): React.CSSProperties {
  const s: Record<string, string> = {};
  if (v.bg) s["--ai-bg"] = v.bg;
  if (v.surface) s["--ai-surface"] = v.surface;
  if (v.text) s["--ai-text"] = v.text;
  if (v.accent) s["--ai-accent"] = v.accent;
  if (v.font) s["--ai-font"] = v.font;
  if (v.radius) s["--ai-radius"] = v.radius;
  return s as React.CSSProperties;
}