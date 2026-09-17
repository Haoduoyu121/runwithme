import {
  cards as defaultCards,
  type CharacterCard,
} from "@/data/cards";

import { loadCards } from "@/lib/storage";

import {
  createLetterId,
  type Letter,
} from "@/data/letter";

const PUNCTS = ["。", "。", "。", "？", "！"];

const REPLY_SUBJECTS = [
  "关于你的信",
  "回信",
  "收到了",
  "见字如面",
];

const SPONTANEOUS_SUBJECTS = [
  "关于今天",
  "随便写写",
  "想跟你说",
  "早安",
  "晚安",
  "这一周",
  "一些小事",
];

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addPunct(text: string): string {
  const t = text.trim();
  if (!t) return t;
  /* 已有结尾标点 */
  if (/[。！？，、；：…]$/.test(t)) return t;
  return (
    t + PUNCTS[Math.floor(Math.random() * PUNCTS.length)]
  );
}

function pickSubject(
  isReply: boolean
): string {
  const pool = isReply
    ? REPLY_SUBJECTS
    : SPONTANEOUS_SUBJECTS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getCharacterPool(
  character: "Levi" | "Erwin"
): CharacterCard[] {
  const all = loadCards(defaultCards);
  return all.filter(
    (c) =>
      c.enabled &&
      c.type === "text" &&
      (c.character === character ||
        c.character === "Shared")
  );
}

const FALLBACK_LINES = [
  "刚刚想到你，就写了这封。",
  "最近有点忙，但没忘记你。",
  "翻到以前的信，又看了一遍。",
  "想说的话太多，反而不知道从哪写起。",
  "你那边天气怎么样？",
];

export function generateCharacterLetter(
  character: "Levi" | "Erwin",
  opts?: {
    replyToId?: string;
    isReply?: boolean;
  }
): Letter | null {
  const pool = getCharacterPool(character);

  /* 卡池为空时用兜底文案，不返回 null */
  if (pool.length === 0) {
    const lineCount = randInt(3, 5);
    const picks: string[] = [];
    for (let i = 0; i < lineCount; i++) {
      const line =
        FALLBACK_LINES[
          Math.floor(Math.random() * FALLBACK_LINES.length)
        ];
      picks.push(addPunct(line));
    }

    return {
      id: createLetterId(),
      from: character,
      to: "You",
      subject: pickSubject(!!opts?.isReply),
      body: picks.join("\n\n"),
      createdAt: Date.now(),
      read: false,
      replyToId: opts?.replyToId,
    };
  }

  const count = randInt(5, 10);
  const picks: string[] = [];
  for (let i = 0; i < count; i++) {
    const card =
      pool[Math.floor(Math.random() * pool.length)];
    picks.push(addPunct(card.text));
  }

  /* 分段落：每 2~3 条 */
  const paras: string[] = [];
  let buf: string[] = [];
  let perPara = randInt(2, 3);
  for (const p of picks) {
    buf.push(p);
    if (buf.length >= perPara) {
      paras.push(buf.join(""));
      buf = [];
      perPara = randInt(2, 3);
    }
  }
  if (buf.length > 0) paras.push(buf.join(""));

  const body = paras.join("\n\n");

  return {
    id: createLetterId(),
    from: character,
    to: "You",
    subject: pickSubject(!!opts?.isReply),
    body,
    createdAt: Date.now(),
    read: false,
    replyToId: opts?.replyToId,
  };
}