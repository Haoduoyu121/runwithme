"use client";

import type {
  AvatarLibraryOwner,
  AvatarLibraryScope,
} from "@/data/avatarLibrary";

import {
  loadAvatarLibraryByOwner,
} from "@/lib/avatarLibraryStorage";

import {
  getAvatarLibraryFile,
} from "@/lib/avatarLibraryFiles";

import { saveChatFile } from "@/lib/chatFiles";
import {
  saveICityFile,
  avatarKey,
} from "@/lib/icityFiles";

import {
  loadSystemSettings,
} from "@/lib/systemStorage";

const CHAT_EVENT = "runwithme:chat-avatar-updated";
const ICITY_EVENT = "runwithme:icity-avatar-updated";

function getChance(
  scope: AvatarLibraryScope,
  owner: AvatarLibraryOwner
): number {
  try {
    const s = loadSystemSettings();
    const cfg = s.avatarSwitch;
    if (!cfg || !cfg.enabled) return 0;
    if (scope === "chat") {
      return owner === "Levi"
        ? cfg.chatChanceLevi
        : cfg.chatChanceErwin;
    }
    return owner === "Levi"
      ? cfg.icityChanceLevi
      : cfg.icityChanceErwin;
  } catch {
    return 0;
  }
}

/**
 * 尝试为某个角色换头像（对应 scope）。
 * - 掷骰子失败 / 库里没图 → 返回 false
 * - 换了 → 返回 true
 */
export async function maybeSwitchAvatar(
  scope: AvatarLibraryScope,
  owner: AvatarLibraryOwner
): Promise<boolean> {
  const chance = getChance(scope, owner);
  if (chance <= 0) return false;
  if (Math.random() >= chance) return false;

  const pool = loadAvatarLibraryByOwner(owner, scope).filter(
    (a) => a.enabled
  );
  if (pool.length === 0) return false;

  const pick = pool[Math.floor(Math.random() * pool.length)];
  const blob = await getAvatarLibraryFile(pick.id);
  if (!blob) return false;

  try {
    if (scope === "chat") {
      await saveChatFile(
        `avatar-${owner.toLowerCase()}`,
        blob
      );
      window.dispatchEvent(new Event(CHAT_EVENT));
    } else {
      await saveICityFile(avatarKey(owner), blob);
      window.dispatchEvent(new Event(ICITY_EVENT));
    }
    return true;
  } catch (e) {
    console.error("换头像失败:", e);
    return false;
  }
}

export const AVATAR_EVENTS = {
  chat: CHAT_EVENT,
  icity: ICITY_EVENT,
};