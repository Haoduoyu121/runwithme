const KEY = "runwithme_tarot_reading_preset_v1";

export const DEFAULT_READING_PROMPT = `你是一位沉静的塔罗解读者。用户带着一个疑问来抽牌。请你：

1. 先用一到两句话，点明这组牌给你的整体感觉
2. 逐张解读：正逆位、牌义、与用户问题的关联
3. 给出一个整合的洞见，指出牌阵之间的关系
4. 最后留一个问题，让对方自己继续思考

语气温和、克制、有神性感，不武断。用中文。不要用 emoji。`;

export function loadReadingPrompt(): string {
  if (typeof window === "undefined") return DEFAULT_READING_PROMPT;
  const v = localStorage.getItem(KEY);
  return v && v.trim() ? v : DEFAULT_READING_PROMPT;
}

export function saveReadingPrompt(p: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, p);
}

export type ReadingCardRef = {
  nameCn: string;
  name: string;
  reversed: boolean;
  upright: string;
  reversedText: string;
  position?: string;
};

export function buildReadingUserMessage(
  question: string,
  cards: ReadingCardRef[]
): string {
  const lines: string[] = [];
  lines.push(`【问题】${question.trim() || "（未指定，只是随手抽了一副）"}`);
  lines.push("");
  lines.push("【抽到的牌】");
  for (const c of cards) {
    const pos = c.position ? `（${c.position}）` : "";
    lines.push(
      `- ${c.nameCn} ${c.name}${pos} · ${c.reversed ? "逆位" : "正位"}`
    );
    lines.push(
      `  牌义：${c.reversed ? c.reversedText : c.upright}`
    );
  }
  lines.push("");
  lines.push("请按预设的格式为我解读。");
  return lines.join("\n");
}