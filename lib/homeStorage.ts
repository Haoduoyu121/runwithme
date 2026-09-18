import type { HomeItem, HomePages } from "@/data/home";

const LAYOUT_KEY = "runwithme_home_layout";

/* ★ 所有合法尺寸 —— 新加尺寸记得同步这里 */
const VALID_SIZES = new Set([
  "1x1",
  "2x2",
  "4x2",
  "2x4",
  "4x4",
]);

/* 合法 widget type */
const VALID_WIDGET_TYPES = new Set([
  "polaroid",
  "countdown",
  "letter",
  "study",
  "daily-quote",
  "music",
]);

function isValidItem(it: unknown): it is HomeItem {
  if (!it || typeof it !== "object") return false;
  const obj = it as Record<string, unknown>;

  if (typeof obj.id !== "string") return false;

  /* ★ 支持所有合法尺寸 */
  if (
    typeof obj.size !== "string" ||
    !VALID_SIZES.has(obj.size)
  ) {
    return false;
  }

  if (!obj.content || typeof obj.content !== "object") {
    return false;
  }

  const c = obj.content as Record<string, unknown>;
  if (c.kind !== "app" && c.kind !== "widget") return false;

  /* ★ widget 类型白名单（避免脏数据） */
  if (c.kind === "widget") {
    if (!c.widget || typeof c.widget !== "object") {
      return false;
    }
    const w = c.widget as Record<string, unknown>;
    if (
      typeof w.type !== "string" ||
      !VALID_WIDGET_TYPES.has(w.type)
    ) {
      return false;
    }
  }

  return true;
}

function sanitizePage(raw: unknown): HomeItem[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.filter(isValidItem);
}

export function loadHomePages(
  defaultItems: HomeItem[]
): HomePages {
  if (typeof window === "undefined") return [defaultItems];

  try {
    const raw = window.localStorage.getItem(LAYOUT_KEY);
    if (!raw) return [defaultItems];

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [defaultItems];
    }

    /* ---------- 旧格式：HomeItem[] ---------- */
    const first = parsed[0];
    const isOldFormat =
      first !== null &&
      typeof first === "object" &&
      !Array.isArray(first);

    if (isOldFormat) {
      const items = (parsed as unknown[]).filter(
        isValidItem
      );
      return items.length > 0 ? [items] : [defaultItems];
    }

    /* ---------- 新格式：HomePages ---------- */
    const pages: HomePages = [];
    for (const rawPage of parsed as unknown[]) {
      const page = sanitizePage(rawPage);
      /* ★ 空页也保留（用户手动删页后刷新要保留） */
      if (page !== null) pages.push(page);
    }

    /* 全是空页 + 至少一页存在 → 返回空页 */
    if (pages.length > 0) return pages;

    return [defaultItems];
  } catch (e) {
    console.error("[homeStorage] 加载失败:", e);
    return [defaultItems];
  }
}

export function saveHomePages(pages: HomePages): boolean {
  if (typeof window === "undefined") return false;

  try {
    const str = JSON.stringify(pages);

    /* 粗略估算：UTF-16 每字符 2 字节 */
    const approxBytes = str.length * 2;
    if (approxBytes > 4.5 * 1024 * 1024) {
      console.warn(
        "[homeStorage] 布局数据过大:",
        (approxBytes / 1024 / 1024).toFixed(2),
        "MB"
      );
    }

    window.localStorage.setItem(LAYOUT_KEY, str);
    return true;
  } catch (e) {
    console.error("[homeStorage] 保存失败:", e);

    if (
      e instanceof DOMException &&
      (e.name === "QuotaExceededError" ||
        e.name === "NS_ERROR_DOM_QUOTA_REACHED")
    ) {
      window.alert(
        "Home 布局保存失败：本地存储空间已满。\n\n" +
          "建议：\n" +
          "1. 到 Settings → 备份 → 导出全部数据\n" +
          "2. 删掉一些不用的图片 / 音乐 / 卡片\n" +
          "3. 或到 Settings → 存储 → 压缩图片 释放空间"
      );
    }

    return false;
  }
}

export function clearHomeLayout(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LAYOUT_KEY);
}