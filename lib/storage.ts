import type { CharacterCard } from "@/data/cards";

const CARDS_STORAGE_KEY = "runwithme_character_cards";
const CARDS_BROKEN_BACKUP_KEY =
  "runwithme_character_cards_broken_backup";

/* -------------------------------------------------------
   去重
   ------------------------------------------------------- */

export function dedupeCards(
  cards: CharacterCard[]
): CharacterCard[] {
  const seen = new Set<string>();
  const result: CharacterCard[] = [];

  for (const card of cards) {
    let key: string;

    if (
      card.type === "text" ||
      card.type === "pat" ||
      card.type === "emoji"
    ) {
      key = `${card.character}|${card.type}|${card.text
        .trim()
        .toLowerCase()}`;
    } else {
      key = `${card.character}|${card.type}|${
        card.mediaId ?? card.id
      }`;
    }

    if (seen.has(key)) continue;
    seen.add(key);
    result.push(card);
  }

  return result;
}

/* -------------------------------------------------------
   加载
   -------------------------------------------------------
   - 无数据 → 写入默认
   - 有数据但损坏 → 备份到 *_broken_backup，返回默认
   - 正常 → 去重后返回
   ------------------------------------------------------- */

export function loadCards(
  defaultCards: CharacterCard[]
): CharacterCard[] {
  if (typeof window === "undefined") {
    return dedupeCards(defaultCards);
  }

  const saved = window.localStorage.getItem(
    CARDS_STORAGE_KEY
  );

  if (!saved) {
    const deduped = dedupeCards(defaultCards);
    try {
      window.localStorage.setItem(
        CARDS_STORAGE_KEY,
        JSON.stringify(deduped)
      );
    } catch (e) {
      console.error(
        "[storage] 写入默认卡片失败（可能 localStorage 已满）:",
        e
      );
    }
    return deduped;
  }

  try {
    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      console.error(
        "[storage] 卡片数据不是数组，已备份到 *_broken_backup"
      );
      try {
        window.localStorage.setItem(
          CARDS_BROKEN_BACKUP_KEY,
          saved
        );
      } catch {
        /* ignore */
      }
      return dedupeCards(defaultCards);
    }

    return dedupeCards(parsed);
  } catch (e) {
    console.error(
      "[storage] 卡片 JSON 解析失败，已备份到 *_broken_backup:",
      e
    );
    try {
      window.localStorage.setItem(
        CARDS_BROKEN_BACKUP_KEY,
        saved
      );
    } catch {
      /* ignore */
    }
    return dedupeCards(defaultCards);
  }
}

/* -------------------------------------------------------
   保存
   -------------------------------------------------------
   - 返回 boolean 让调用方知道是否成功
   - QuotaExceededError 明确提示用户，不静默吞掉
   ------------------------------------------------------- */

export function saveCards(
  cardList: CharacterCard[]
): boolean {
  if (typeof window === "undefined") return false;

  const deduped = dedupeCards(cardList);

  try {
    window.localStorage.setItem(
      CARDS_STORAGE_KEY,
      JSON.stringify(deduped)
    );
    return true;
  } catch (e) {
    console.error("[storage] 保存卡片失败:", e);

    if (
      e instanceof DOMException &&
      (e.name === "QuotaExceededError" ||
        e.name === "NS_ERROR_DOM_QUOTA_REACHED")
    ) {
      window.alert(
        "卡片保存失败：localStorage 空间已满。\n\n" +
          "建议：\n" +
          "1. 先到 Settings → 备份 → 导出全部数据\n" +
          "2. 删掉一些不用的卡片\n" +
          "3. 或到 Settings → 存储 → 压缩图片 释放空间"
      );
    }

    return false;
  }
}

export function clearSavedCards(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CARDS_STORAGE_KEY);
}

/* 恢复被损坏备份 */
export function restoreBrokenBackup(): boolean {
  if (typeof window === "undefined") return false;
  const broken = window.localStorage.getItem(
    CARDS_BROKEN_BACKUP_KEY
  );
  if (!broken) return false;
  try {
    const parsed = JSON.parse(broken);
    if (!Array.isArray(parsed)) return false;
    window.localStorage.setItem(
      CARDS_STORAGE_KEY,
      JSON.stringify(parsed)
    );
    window.localStorage.removeItem(CARDS_BROKEN_BACKUP_KEY);
    return true;
  } catch {
    return false;
  }
}