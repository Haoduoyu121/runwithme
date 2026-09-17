/* =========================================================================
   Watch App · 聊天字卡（独立卡池）
   Key: runwithme_watch_cards_v1
   不混入 Chat 的 Card Studio
   ========================================================================= */

export type WatchCard = {
  id: string;
  character: "Levi" | "Erwin";
  text: string;
  enabled: boolean;
};

const KEY = "runwithme_watch_cards_v1";

export const DEFAULT_WATCH_CARDS: WatchCard[] = [
  /* Levi */
  {
    id: "w-levi-1",
    character: "Levi",
    text: "这段我看了三遍了，还是好看。",
    enabled: true,
  },
  {
    id: "w-levi-2",
    character: "Levi",
    text: "你怎么看这段？",
    enabled: true,
  },
  {
    id: "w-levi-3",
    character: "Levi",
    text: "等下，我倒回去一点。",
    enabled: true,
  },
  {
    id: "w-levi-4",
    character: "Levi",
    text: "哈哈这段每次都戳我。",
    enabled: true,
  },
  {
    id: "w-levi-5",
    character: "Levi",
    text: "嗯……让我想想。",
    enabled: true,
  },
  {
    id: "w-levi-6",
    character: "Levi",
    text: "这块的配乐不错。",
    enabled: true,
  },
  {
    id: "w-levi-7",
    character: "Levi",
    text: "你坐近点，我这边听不太清。",
    enabled: true,
  },
  {
    id: "w-levi-8",
    character: "Levi",
    text: "记一下这个画面，回头聊。",
    enabled: true,
  },
  {
    id: "w-levi-9",
    character: "Levi",
    text: "……为什么我看这段会脸红。",
    enabled: true,
  },
  {
    id: "w-levi-10",
    character: "Levi",
    text: "别说话，专心看。",
    enabled: true,
  },

  /* Erwin */
  {
    id: "w-erwin-1",
    character: "Erwin",
    text: "这一段值得再看一遍。",
    enabled: true,
  },
  {
    id: "w-erwin-2",
    character: "Erwin",
    text: "你在想什么？",
    enabled: true,
  },
  {
    id: "w-erwin-3",
    character: "Erwin",
    text: "……哦，原来是这样。",
    enabled: true,
  },
  {
    id: "w-erwin-4",
    character: "Erwin",
    text: "有意思。",
    enabled: true,
  },
  {
    id: "w-erwin-5",
    character: "Erwin",
    text: "这里我记下来了。",
    enabled: true,
  },
  {
    id: "w-erwin-6",
    character: "Erwin",
    text: "节奏有点慢，但好看。",
    enabled: true,
  },
  {
    id: "w-erwin-7",
    character: "Erwin",
    text: "你选的这部？品味不错。",
    enabled: true,
  },
  {
    id: "w-erwin-8",
    character: "Erwin",
    text: "回头我们再一起看一遍。",
    enabled: true,
  },
  {
    id: "w-erwin-9",
    character: "Erwin",
    text: "刚刚那个镜头，很漂亮。",
    enabled: true,
  },
  {
    id: "w-erwin-10",
    character: "Erwin",
    text: "你冷吗？我去拿条毯子。",
    enabled: true,
  },
];

export function loadWatchCards(): WatchCard[] {
  if (typeof window === "undefined") return DEFAULT_WATCH_CARDS;

  const raw = window.localStorage.getItem(KEY);

  if (!raw) {
    window.localStorage.setItem(
      KEY,
      JSON.stringify(DEFAULT_WATCH_CARDS)
    );
    return DEFAULT_WATCH_CARDS;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_WATCH_CARDS;

    const cleaned: WatchCard[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item.id === "string" &&
        (item.character === "Levi" ||
          item.character === "Erwin") &&
        typeof item.text === "string" &&
        typeof item.enabled === "boolean"
      ) {
        cleaned.push(item as WatchCard);
      }
    }
    return cleaned;
  } catch {
    return DEFAULT_WATCH_CARDS;
  }
}

export function saveWatchCards(cards: WatchCard[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(cards));
}

export function pickWatchCard(
  character: "Levi" | "Erwin"
): WatchCard | null {
  const pool = loadWatchCards().filter(
    (c) => c.enabled && c.character === character
  );
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}