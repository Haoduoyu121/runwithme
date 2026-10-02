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

export const AVATAR_EVENTS = {
  chat: CHAT_EVENT,
  icity: ICITY_EVENT,
};

/**
 * 直接写入头像到目标 scope。
 * 不做任何概率/骰子判定。
 */
export async function writeAvatar(
  scope: AvatarLibraryScope,
  owner: AvatarLibraryOwner,
  blob: Blob
): Promise<boolean> {
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
    console.error("写头像失败:", e);
    return false;
  }
}

/**
 * 从角色头像库里随机挑一张（对应 scope），直接换上。
 * 给"后台主动换"用。
 */
export async function pickRandomAndWrite(
  scope: AvatarLibraryScope,
  owner: AvatarLibraryOwner
): Promise<boolean> {
  const pool = loadAvatarLibraryByOwner(owner, scope).filter(
    (a) => a.enabled
  );
  if (pool.length === 0) return false;

  const pick = pool[Math.floor(Math.random() * pool.length)];
  const blob = await getAvatarLibraryFile(pick.id);
  if (!blob) return false;

  return writeAvatar(scope, owner, blob);
}

/**
 * 读 iCity 头像切概率
 */
export function getICityChance(
  owner: AvatarLibraryOwner
): number {
  try {
    const s = loadSystemSettings();
    const cfg = s.avatarSwitch;
    if (!cfg) return 0;
    return owner === "Levi"
      ? cfg.icityChanceLevi
      : cfg.icityChanceErwin;
  } catch {
    return 0;
  }
}

/**
 * 给 iCity 用：角色发帖 / 评论时掷骰子换头像
 */
export async function maybeSwitchICityAvatar(
  owner: AvatarLibraryOwner
): Promise<boolean> {
  const chance = getICityChance(owner);
  if (chance <= 0) return false;
  if (Math.random() >= chance) return false;
  return pickRandomAndWrite("icity", owner);
}

/**
 * 角色从「用户头像库」里随机挑一张，给用户换上。
 */
export async function roleSwitchUserAvatar(): Promise<boolean> {
  const pool = loadAvatarLibraryByOwner("You", "chat").filter(
    (a) => a.enabled
  );
  if (pool.length === 0) return false;

  const pick = pool[Math.floor(Math.random() * pool.length)];
  const blob = await getAvatarLibraryFile(pick.id);
  if (!blob) return false;

  return writeAvatar("chat", "You", blob);
}