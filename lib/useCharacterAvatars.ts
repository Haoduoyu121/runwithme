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

export function useCharacterAvatars(): CharacterAvatars {
  const [urls, setUrls] =
    useState<CharacterAvatars>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    let created: string[] = [];

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

    /* ★ 换头像事件 → 重新加载 */
    function onAvatarUpdated() {
      created.forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {}
      });
      created = [];
      void load();
    }
    window.addEventListener(
      "runwithme:chat-avatar-updated",
      onAvatarUpdated
    );

    return () => {
      cancelled = true;
      window.removeEventListener(
        "runwithme:chat-avatar-updated",
        onAvatarUpdated
      );
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  return urls;
}

export function toAvatarKey(
  who: string
): AvatarKey | null {
  const w = who.toLowerCase();
  if (w === "levi") return "levi";
  if (w === "erwin") return "erwin";
  if (w === "you" || w === "yui") return "you";
  return null;
}