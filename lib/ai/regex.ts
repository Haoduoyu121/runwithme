/**
 * SillyTavern 正则脚本支持
 * placement: 1 = 用户输入, 2 = AI 输出
 */

export type STRegexScript = {
  id: string;
  scriptName: string;
  findRegex: string;
  replaceString: string;
  placement: number[];
  disabled: boolean;
  markdownOnly: boolean;
  promptOnly: boolean;
  runOnEdit: boolean;
};

export type RegexScripts = STRegexScript[];

function parseFindRegex(s: string): RegExp | null {
  /* /pattern/flags 格式；不用 s flag，改用 [\s\S] 兼容低版本 */
  const m = /^\/([\s\S]*)\/([gimsuy]*)$/.exec(s);
  if (m) {
    try {
      return new RegExp(m[1], m[2]);
    } catch {
      return null;
    }
  }
  try {
    return new RegExp(s, "g");
  } catch {
    return null;
  }
}

export function applyRegexScripts(
  text: string,
  scripts: RegexScripts | undefined,
  placement: 1 | 2
): string {
  if (!scripts || scripts.length === 0) return text;
  let out = text;
  for (const s of scripts) {
    if (s.disabled) continue;
    if (
      !Array.isArray(s.placement) ||
      !s.placement.includes(placement)
    )
      continue;
    const re = parseFindRegex(s.findRegex);
    if (!re) continue;
    try {
      out = out.replace(re, s.replaceString || "");
    } catch (e) {
      console.warn("[regex] 应用失败:", s.scriptName, e);
    }
  }
  return out;
}

/** 从 ST 预设 JSON 提取正则脚本 */
export function extractRegexScripts(
  json: unknown
): RegexScripts {
  const j = (json || {}) as {
    extensions?: { regex_scripts?: unknown };
  };
  const raw = j.extensions?.regex_scripts;
  if (!Array.isArray(raw)) return [];
  const out: RegexScripts = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const find = typeof o.findRegex === "string" ? o.findRegex : "";
    if (!find) continue;
    out.push({
      id:
        typeof o.id === "string"
          ? o.id
          : `rx-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 8)}`,
      scriptName:
        typeof o.scriptName === "string"
          ? o.scriptName
          : "未命名",
      findRegex: find,
      replaceString:
        typeof o.replaceString === "string"
          ? o.replaceString
          : "",
      placement: Array.isArray(o.placement)
        ? (o.placement as number[]).filter(
            (x): x is number => typeof x === "number"
          )
        : [2],
      disabled: o.disabled === true,
      markdownOnly: o.markdownOnly === true,
      promptOnly: o.promptOnly === true,
      runOnEdit: o.runOnEdit === true,
    });
  }
  return out;
}