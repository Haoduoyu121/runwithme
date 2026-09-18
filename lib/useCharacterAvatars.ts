"use client";

import { useEffect, useState } from "react";

import { getChatFile } from "@/lib/chatFiles";

export type AvatarKey = "you" | "levi" | "erwin";

export type CharacterAvatars = Record<
  AvatarKey,
  string | null
>;

const EMPTY: CharacterAvatars = {
  you: null,
  levi: null,
  erwin: null,
};

/**
 * 读取 Chat / Home Studio 里保存的自定义头像。
 *
 * 数据源：runwithme_chat_files_db
 *   avatar-you / avatar-levi / avatar-erwin
 *
 * 用法：
 *   const avatars = useCharacterAvatars();
 *   avatars.levi   // string | null （objectURL）
 *
 * 卸载时自动释放所有 objectURL。
 */
export function useCharacterAvatars(): CharacterAvatars {
  const [urls, setUrls] =
    useState<CharacterAvatars>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];

    async function load() {
      const next: CharacterAvatars = { ...EMPTY };

      for (const key of [
        "you",
        "levi",
        "erwin",
      ] as AvatarKey[]) {
        try {
          const file = await getChatFile(
            `avatar-${key}`
          );
          if (!file) continue;
          const url = URL.createObjectURL(file);
          created.push(url);
          next[key] = url;
        } catch (e) {
          console.error("加载头像失败:", key, e);
        }
      }

      if (cancelled) {
        created.forEach((u) => URL.revokeObjectURL(u));
        return;
      }
      setUrls(next);
    }

    void load();

    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  return urls;
}

/**
 * 把 "Levi" / "Erwin" / "Yui" / "You" 映射到 AvatarKey。
 * 大小写都兼容。无法识别时返回 null。
 */
export function toAvatarKey(
  who: string
): AvatarKey | null {
  const w = who.toLowerCase();
  if (w === "levi") return "levi";
  if (w === "erwin") return "erwin";
  if (w === "you" || w === "yui") return "you";
  return null;
}