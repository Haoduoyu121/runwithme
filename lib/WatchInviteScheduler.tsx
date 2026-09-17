"use client";

import {
  useEffect,
  useRef,
  type ReactNode,
} from "react";

import { useNotifications } from "@/lib/NotificationContext";

/* 判定间隔：30 分钟 ~ 2 小时 */
const INTERVAL_MIN_MS = 30 * 60 * 1000;
const INTERVAL_MAX_MS = 2 * 60 * 60 * 1000;

/* 每次判定 20% 概率真的发 */
const INVITE_CHANCE = 0.2;

/* 页面不可见时的重试延迟 */
const INVISIBLE_RETRY_MS = 5 * 60 * 1000;

function randBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function WatchInviteScheduler({
  children,
}: {
  children: ReactNode;
}) {
  const { notify } = useNotifications();
  const notifyRef = useRef(notify);

  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

  const fireInviteRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    function fireInvite() {
      const who = Math.random();

      let character: "Levi" | "Erwin";
      let title: string;

      if (who < 0.34) {
        character = "Levi";
        title = "Levi";
      } else if (who < 0.68) {
        character = "Erwin";
        title = "Erwin";
      } else {
        character =
          Math.random() < 0.5 ? "Levi" : "Erwin";
        title = "Levi & Erwin";
      }

      notifyRef.current({
        appId: "watch",
        character,
        title,
        body: "邀请你一起看视频",
      });
    }

    fireInviteRef.current = fireInvite;

    function schedule() {
      if (cancelled) return;
      const delay = randBetween(
        INTERVAL_MIN_MS,
        INTERVAL_MAX_MS
      );
      timer = window.setTimeout(tick, delay);
    }

    function tick() {
      if (cancelled) return;

      /* 页面不可见 → 5 分钟后再试，不计入正常轮次 */
      if (
        typeof document !== "undefined" &&
        document.visibilityState !== "visible"
      ) {
        timer = window.setTimeout(
          tick,
          INVISIBLE_RETRY_MS
        );
        return;
      }

      if (Math.random() < INVITE_CHANCE) {
        fireInvite();
      }

      /* 无论是否发出，都排下一轮 */
      schedule();
    }

    schedule();

    return () => {
      cancelled = true;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      fireInviteRef.current = () => {};
    };
  }, []);

  /* 开发期手动触发入口（可删） */
  useEffect(() => {
    if (typeof window === "undefined") return;

    (
      window as unknown as {
        __rwTestWatchInvite?: () => void;
      }
    ).__rwTestWatchInvite = () => {
      fireInviteRef.current();
    };

    return () => {
      delete (
        window as unknown as {
          __rwTestWatchInvite?: () => void;
        }
      ).__rwTestWatchInvite;
    };
  }, []);

  return <>{children}</>;
}