const STORAGE_KEY = "runwithme_read_chat_cards_v1";

export type ReadChatCardCharacter = "Levi" | "Erwin";

export type ReadChatCard = {
  id: string;
  character: ReadChatCardCharacter;
  text: string;
  category: string;
  enabled: boolean;
};

const DEFAULT_READ_CHAT_CARDS: ReadChatCard[] = [
  /* ---------- Levi ---------- */
  { id: "levi-01", character: "Levi", category: "读后", text: "这段我倒是记住了。", enabled: true },
  { id: "levi-02", character: "Levi", category: "读后", text: "写得不错。", enabled: true },
  { id: "levi-03", character: "Levi", category: "读后", text: "你看到这一页了？", enabled: true },
  { id: "levi-04", character: "Levi", category: "催促", text: "继续。", enabled: true },
  { id: "levi-05", character: "Levi", category: "评论", text: "这个人挺有意思。", enabled: true },
  { id: "levi-06", character: "Levi", category: "评论", text: "啰嗦。但还行。", enabled: true },
  { id: "levi-07", character: "Levi", category: "闲聊", text: "你困了就说。", enabled: true },
  { id: "levi-08", character: "Levi", category: "闲聊", text: "……", enabled: true },

  /* ---------- Erwin ---------- */
  { id: "erwin-01", character: "Erwin", category: "读后", text: "这段写得很稳。", enabled: true },
  { id: "erwin-02", character: "Erwin", category: "读后", text: "你注意到这一页了吗？", enabled: true },
  { id: "erwin-03", character: "Erwin", category: "读后", text: "不错的节奏。", enabled: true },
  { id: "erwin-04", character: "Erwin", category: "催促", text: "再读一点吧。", enabled: true },
  { id: "erwin-05", character: "Erwin", category: "评论", text: "这一章值得慢慢看。", enabled: true },
  { id: "erwin-06", character: "Erwin", category: "评论", text: "我想听听你的想法。", enabled: true },
  { id: "erwin-07", character: "Erwin", category: "闲聊", text: "累了吗？", enabled: true },
  { id: "erwin-08", character: "Erwin", category: "闲聊", text: "你读得比我想象的认真。", enabled: true },
];

function isValidCard(c: unknown): c is ReadChatCard {
  if (!c || typeof c !== "object") return false;
  const o = c as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    (o.character === "Levi" || o.character === "Erwin") &&
    typeof o.text === "string" &&
    typeof o.enabled === "boolean"
  );
}

export function loadReadChatCards(): ReadChatCard[] {
  if (typeof window === "undefined") return DEFAULT_READ_CHAT_CARDS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_READ_CHAT_CARDS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_READ_CHAT_CARDS;
    const valid = parsed.filter(isValidCard);
    return valid.length > 0 ? valid : DEFAULT_READ_CHAT_CARDS;
  } catch (e) {
    console.error("[readChatCards] 加载失败:", e);
    return DEFAULT_READ_CHAT_CARDS;
  }
}

export function saveReadChatCards(
  cards: ReadChatCard[]
): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    return true;
  } catch (e) {
    console.error("[readChatCards] 保存失败:", e);
    return false;
  }
}

export function resetReadChatCards(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function createReadChatCardId(
  prefix = "rc"
): string {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function pickReadChatCard(
  partners: ReadChatCardCharacter[],
  recentTexts: string[] = []
): ReadChatCard | null {
  if (partners.length === 0) return null;

  const all = loadReadChatCards();
  const enabled = all.filter(
    (c) =>
      c.enabled &&
      partners.includes(c.character) &&
      !recentTexts.includes(c.text)
  );

  const pool =
    enabled.length > 0
      ? enabled
      : all.filter(
          (c) =>
            c.enabled && partners.includes(c.character)
        );

  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}