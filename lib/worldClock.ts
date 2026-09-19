/**
 * 世界时钟 / 事件补偿
 *
 * 用户离开 app 一段时间后回来，让"世界"补上这段时间发生的事。
 * 纯前端：不改任何后端，只写 localStorage。
 *
 * 机制：
 * - app 启动时调用 runWorldCompensation()
 * - 页面从后台切回前台也调用一次
 * - 计算离线时长 now - lastActiveAt
 * - 离线 >= 30 分钟 → 触发所有补偿器
 * - 补偿器自行决定生成多少事件
 * - 完成后更新 lastActiveAt
 */

const KEY = "runwithme_world_clock_v1";

/** 离线至少这么久才补偿 */
export const MIN_AWAY_MS = 30 * 60 * 1000;

export type CompensationArgs = {
  from: number;
  to: number;
  offlineMs: number;
};

export type Compensator = {
  id: string;
  /** 返回本次生成的事件数 */
  compensate: (args: CompensationArgs) => number;
};

/* =========================================================
   状态
   ========================================================= */

type State = {
  lastActiveAt: number;
};

function loadState(): State {
  if (typeof window === "undefined") {
    return { lastActiveAt: 0 };
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { lastActiveAt: 0 };
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed.lastActiveAt !== "number"
    ) {
      return { lastActiveAt: 0 };
    }
    return { lastActiveAt: parsed.lastActiveAt };
  } catch {
    return { lastActiveAt: 0 };
  }
}

function saveState(s: State): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch (e) {
    console.error("[worldClock] 保存失败:", e);
  }
}

export function getLastActiveAt(): number {
  return loadState().lastActiveAt;
}

export function markActiveNow(): void {
  saveState({ lastActiveAt: Date.now() });
}

/* =========================================================
   补偿器注册表
   ========================================================= */

const compensators: Compensator[] = [];

export function registerCompensator(c: Compensator): void {
  if (compensators.find((x) => x.id === c.id)) {
    return;
  }
  compensators.push(c);
}

/* =========================================================
   Chat 补偿器
   ========================================================= */

const CHAT_STORAGE_KEY = "runwithme_chat_messages";

const WORLD_CHAT_LINES = [
  "你回来了。",
  "刚才想给你发消息的。",
  "外面下雨了。",
  "忙完了吗？",
  "今天吃了什么？",
  "有点想你。",
  "图书馆又换了新书。",
  "今晚的月亮很好看。",
  "训练结束了，有点累。",
  "你呢？在做什么？",
  "刚泡了茶，给你也留了一杯。",
  "想到了一件事，等你回来说。",
  "看了一会儿书，有点困。",
  "街上人很多。",
  "今天风很大。",
  "回来记得说一声。",
  "有点安静。",
  "刚才翻到一张旧照片。",
  "煮了面，加了个蛋。",
  "下次一起去看看好不好。",
];

/** 根据离线时长决定要生成几条 */
function decideCount(offlineMs: number): number {
  if (offlineMs < 30 * 60 * 1000) return 0;
  if (offlineMs < 2 * 60 * 60 * 1000) {
    return 1 + Math.floor(Math.random() * 2); // 1-2
  }
  if (offlineMs < 8 * 60 * 60 * 1000) {
    return 2 + Math.floor(Math.random() * 3); // 2-4
  }
  if (offlineMs < 24 * 60 * 60 * 1000) {
    return 3 + Math.floor(Math.random() * 4); // 3-6
  }
  return 5 + Math.floor(Math.random() * 5); // 5-9
}

function compensateChat({
  from,
  to,
  offlineMs,
}: CompensationArgs): number {
  const count = decideCount(offlineMs);
  if (count === 0) return 0;

  /* 读现有消息 */
  let existing: unknown[] = [];
  try {
    const raw = window.localStorage.getItem(
      CHAT_STORAGE_KEY
    );
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) existing = parsed;
    }
  } catch {
    existing = [];
  }

  /* 生成新消息 */
  const newMessages: {
    id: string;
    sender: "Levi" | "Erwin";
    type: "text";
    text: string;
    timestamp: number;
  }[] = [];

  const span = offlineMs / count;

  for (let i = 0; i < count; i++) {
    /* 时间戳在 (from, to) 内均匀分布，加 ±30% 抖动 */
    const baseT = from + span * (i + 0.5);
    const jitter = (Math.random() - 0.5) * span * 0.6;
    const t = Math.min(
      to - 1000,
      Math.max(from + 1000, Math.floor(baseT + jitter))
    );

    const sender =
      Math.random() < 0.5 ? "Levi" : "Erwin";
    const text =
      WORLD_CHAT_LINES[
        Math.floor(Math.random() * WORLD_CHAT_LINES.length)
      ];

    newMessages.push({
      id: `msg-world-${t}-${i}-${Math.random()
        .toString(36)
        .slice(2, 6)}`,
      sender,
      type: "text",
      text,
      timestamp: t,
    });
  }

  /* 合并、按时间排序、写回 */
  const merged = [...existing, ...newMessages].sort(
    (a, b) => {
      const ta = (a as { timestamp?: number }).timestamp ?? 0;
      const tb = (b as { timestamp?: number }).timestamp ?? 0;
      return ta - tb;
    }
  );

  try {
    window.localStorage.setItem(
      CHAT_STORAGE_KEY,
      JSON.stringify(merged)
    );
  } catch (e) {
    console.error("[worldClock] Chat 写入失败:", e);
    return 0;
  }

  return count;
}

/* 自动注册 Chat 补偿器 */
registerCompensator({
  id: "chat",
  compensate: compensateChat,
});

/* =========================================================
   运行
   ========================================================= */

export type CompensationResult = {
  offlineMs: number;
  triggered: boolean;
  generated: number;
  details: Record<string, number>;
};

export function runWorldCompensation(): CompensationResult {
  if (typeof window === "undefined") {
    return {
      offlineMs: 0,
      triggered: false,
      generated: 0,
      details: {},
    };
  }

  const state = loadState();
  const now = Date.now();

  /* 首次启动，没记录 → 只记录，不补偿 */
  if (state.lastActiveAt === 0) {
    saveState({ lastActiveAt: now });
    return {
      offlineMs: 0,
      triggered: false,
      generated: 0,
      details: {},
    };
  }

  const offlineMs = now - state.lastActiveAt;

  /* 离线太短 → 只更新 */
  if (offlineMs < MIN_AWAY_MS) {
    saveState({ lastActiveAt: now });
    return {
      offlineMs,
      triggered: false,
      generated: 0,
      details: {},
    };
  }

  /* 跑所有补偿器 */
  const args: CompensationArgs = {
    from: state.lastActiveAt,
    to: now,
    offlineMs,
  };

  const details: Record<string, number> = {};
  let total = 0;

  for (const c of compensators) {
    try {
      const n = c.compensate(args);
      details[c.id] = n;
      total += n;
    } catch (e) {
      console.error(
        `[worldClock] 补偿器 ${c.id} 出错:`,
        e
      );
    }
  }

  saveState({ lastActiveAt: now });

  console.log(
    `[worldClock] 离线 ${(offlineMs / 60000).toFixed(
      1
    )} 分钟，生成事件：`,
    details
  );

  return {
    offlineMs,
    triggered: true,
    generated: total,
    details,
  };
}