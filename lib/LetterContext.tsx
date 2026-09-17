"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type {
  Letter,
  PendingLetter,
} from "@/data/letter";
import { createLetterId } from "@/data/letter";

import {
  loadLetters,
  saveLetters,
  loadPendingLetters,
  savePendingLetters,
  loadLastSystemLetterAt,
  saveLastSystemLetterAt,
} from "@/lib/letterStorage";

import { generateCharacterLetter } from "@/lib/letterGenerator";
import { useNotifications } from "@/lib/NotificationContext";

/* 用户寄信 → 对方回信延迟：6~12 小时 */
const REPLY_MIN_MS = 6 * 60 * 60 * 1000;
const REPLY_MAX_MS = 12 * 60 * 60 * 1000;

/* 系统主动信：12~24 小时一次 */
const SYSTEM_MIN_MS = 12 * 60 * 60 * 1000;
const SYSTEM_MAX_MS = 24 * 60 * 60 * 1000;

/* 每 5 分钟检查一次队列 */
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

type LetterContextValue = {
  letters: Letter[];
  unreadCount: number;
  sendLetterTo: (
    target: "Levi" | "Erwin",
    subject: string,
    body: string
  ) => void;
  markRead: (id: string) => void;
  deleteLetter: (id: string) => void;
};

const LetterContext =
  createContext<LetterContextValue | null>(null);

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function LetterProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { notify } = useNotifications();
  const notifyRef = useRef(notify);

  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

  const [letters, setLetters] = useState<Letter[]>([]);
  const lettersRef = useRef<Letter[]>([]);

  useEffect(() => {
    lettersRef.current = letters;
  }, [letters]);

  useEffect(() => {
    setLetters(loadLetters());
  }, []);

  useEffect(() => {
    if (letters.length === 0) return;
    saveLetters(letters);
  }, [letters]);

  /* -------------------------------------------------------
     处理队列（回信 + 主动信）
     ------------------------------------------------------- */

  const processQueue = useCallback(() => {
    const now = Date.now();
    const pending = loadPendingLetters();

    const duePending = pending.filter(
      (p) => p.dueAt <= now
    );
    const stillPending: PendingLetter[] = pending.filter(
      (p) => p.dueAt > now
    );

    const newLetters: Letter[] = [];

    /* 到期的回信 */
    for (const p of duePending) {
      const letter = generateCharacterLetter(p.from, {
        replyToId: p.replyToId,
        isReply: true,
      });
      if (letter) {
        newLetters.push(letter);
      } else {
        /* 卡池为空 / 生成失败 → 保留，1 小时后再试 */
        console.warn(
          "[Letter] 回信生成失败（卡池可能为空），1 小时后再试",
          p.from
        );
        stillPending.push({
          ...p,
          dueAt: now + 60 * 60 * 1000,
        });
      }
    }

    /* 系统主动信 */
    const lastSystem = loadLastSystemLetterAt();
    let shouldFireSystem = false;

    if (lastSystem === 0) {
      shouldFireSystem = true;
    } else {
      const nextAt =
        lastSystem +
        SYSTEM_MIN_MS +
        Math.random() *
          (SYSTEM_MAX_MS - SYSTEM_MIN_MS);
      if (now >= nextAt) {
        shouldFireSystem = true;
      }
    }

    if (shouldFireSystem) {
      const character: "Levi" | "Erwin" =
        Math.random() < 0.5 ? "Levi" : "Erwin";
      const letter = generateCharacterLetter(character, {
        isReply: false,
      });
      if (letter) {
        newLetters.push(letter);
        saveLastSystemLetterAt(now);
        console.log(
          "[Letter] 系统主动信:",
          character
        );
      }
    }

    savePendingLetters(stillPending);

    if (newLetters.length > 0) {
      setLetters((prev) => {
        const next = [...prev, ...newLetters];
        saveLetters(next);
        return next;
      });

      /* 站内通知：按角色合并，避免同批多发刷屏 */
      const byChar: Record<"Levi" | "Erwin", number> = {
        Levi: 0,
        Erwin: 0,
      };
      for (const letter of newLetters) {
        if (letter.from === "You") continue;
        byChar[letter.from] += 1;
      }
      (["Levi", "Erwin"] as const).forEach((ch) => {
        const n = byChar[ch];
        if (n === 0) return;
        notifyRef.current({
          appId: "letter",
          character: ch,
          title: ch,
          body:
            n === 1
              ? "给你写了一封信"
              : `给你写了 ${n} 封信`,
        });
      });
    }
  }, []);

  /* 定时器 + 立即检查 */
  useEffect(() => {
    processQueue();

    const timer = window.setInterval(() => {
      processQueue();
    }, CHECK_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [processQueue]);

  /* -------------------------------------------------------
     寄信
     ------------------------------------------------------- */

  const sendLetterTo = useCallback(
    (
      target: "Levi" | "Erwin",
      subject: string,
      body: string
    ) => {
      const trimmedBody = body.trim();
      if (!trimmedBody) return;

      const now = Date.now();

      const letter: Letter = {
        id: createLetterId(),
        from: "You",
        to: target,
        subject: subject.trim() || "(无主题)",
        body: trimmedBody,
        createdAt: now,
        read: true,
      };

      setLetters((prev) => {
        const next = [...prev, letter];
        saveLetters(next);
        return next;
      });

      /* 排入 pending */
      const pending = loadPendingLetters();
      const delay = randInt(
        REPLY_MIN_MS,
        REPLY_MAX_MS
      );

      const p: PendingLetter = {
        id: `pending-${now}-${Math.random()
          .toString(36)
          .slice(2, 6)}`,
        from: target,
        to: "You",
        dueAt: now + delay,
        kind: "reply",
        replyToId: letter.id,
      };

      savePendingLetters([...pending, p]);

      console.log(
        `[Letter] 已寄给 ${target}，预计 ${(
          delay / 3600000
        ).toFixed(1)}h 后回信`
      );
    },
    []
  );

  const markRead = useCallback((id: string) => {
    setLetters((prev) => {
      const next = prev.map((l) =>
        l.id === id && !l.read
          ? { ...l, read: true }
          : l
      );
      saveLetters(next);
      return next;
    });
  }, []);

  const deleteLetter = useCallback((id: string) => {
    setLetters((prev) => {
      const next = prev.filter((l) => l.id !== id);
      saveLetters(next);
      return next;
    });
  }, []);

  const unreadCount = letters.filter(
    (l) => l.from !== "You" && !l.read
  ).length;

  return (
    <LetterContext.Provider
      value={{
        letters,
        unreadCount,
        sendLetterTo,
        markRead,
        deleteLetter,
      }}
    >
      {children}
    </LetterContext.Provider>
  );
}

export function useLetters() {
  const ctx = useContext(LetterContext);
  if (!ctx) {
    throw new Error(
      "useLetters must be used inside LetterProvider"
    );
  }
  return ctx;
}