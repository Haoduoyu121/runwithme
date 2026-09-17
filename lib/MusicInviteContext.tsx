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

import { useMusic } from "@/lib/MusicContext";
import { useChat } from "@/lib/ChatContext";
import { createMessageId } from "@/data/chat";

import {
  loadListenPartner,
  saveListenPartner,
  type ListenPartner,
} from "@/lib/listenTogetherStorage";

import {
  loadLastInviteTime,
  saveLastInviteTime,
  loadPendingInvite,
  savePendingInvite,
  clearPendingInvite,
  type SystemInvitation,
} from "@/lib/systemInvitationStorage";

import { useNotifications } from "@/lib/NotificationContext";

const SYSTEM_INVITE_MIN_MS = 30 * 60 * 1000;
const SYSTEM_INVITE_MAX_MS = 90 * 60 * 1000;
const SYSTEM_INVITE_EXPIRE_MS = 90 * 1000;
const FIRST_INVITE_MIN_MS = 60 * 1000;
const FIRST_INVITE_MAX_MS = 5 * 60 * 1000;
const RANDOM_PLAY_MIN_MS = 6 * 1000;
const RANDOM_PLAY_MAX_MS = 15 * 1000;

type MusicInviteContextValue = {
  systemInvite: SystemInvitation | null;
  remaining: number;
  triggerNow: () => void;
  accept: () => void;
  decline: () => void;
};

const MusicInviteContext =
  createContext<MusicInviteContextValue | null>(null);

export function MusicInviteProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { music, playTrack } = useMusic();
  const { addMessage } = useChat();

  const { notify } = useNotifications();
  const notifyRef = useRef(notify);

  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

  const [partner, setPartner] = useState<ListenPartner>("Solo");
  const [systemInvite, setSystemInvite] =
    useState<SystemInvitation | null>(null);
  const [remaining, setRemaining] = useState(0);

  const partnerRef = useRef(partner);
  const musicRef = useRef(music);
  const systemInviteRef = useRef(systemInvite);

  useEffect(() => {
    partnerRef.current = partner;
  }, [partner]);

  useEffect(() => {
    musicRef.current = music;
  }, [music]);

  useEffect(() => {
    systemInviteRef.current = systemInvite;
  }, [systemInvite]);

  /* 初始化 */
  useEffect(() => {
    setPartner(loadListenPartner());
    const pending = loadPendingInvite();
    if (pending && pending.expiresAt > Date.now()) {
      setSystemInvite(pending);
    } else if (pending) {
      clearPendingInvite();
    }
  }, []);

  /* 监听 partner 变化 */
  useEffect(() => {
    function onChange() {
      setPartner(loadListenPartner());
    }
    window.addEventListener(
      "runwithme:listen-partner-change",
      onChange
    );
    return () => {
      window.removeEventListener(
        "runwithme:listen-partner-change",
        onChange
      );
    };
  }, []);

  /* -------------------------------------------------------
     triggerInvite
     ------------------------------------------------------- */

  const triggerInvite = useCallback(() => {
    if (partnerRef.current !== "Solo") return;
    if (systemInviteRef.current) return;
    if (musicRef.current.length === 0) return;

    const targets: ("Levi" | "Erwin" | "Both")[] = [
      "Levi",
      "Erwin",
      "Both",
    ];
    const from =
      targets[Math.floor(Math.random() * targets.length)];

    const now = Date.now();
    const inv: SystemInvitation = {
      id: `sinv-${now}-${Math.random()
        .toString(36)
        .slice(2, 6)}`,
      from,
      createdAt: now,
      expiresAt: now + SYSTEM_INVITE_EXPIRE_MS,
    };

    saveLastInviteTime(now);
    savePendingInvite(inv);
    setSystemInvite(inv);

    console.log("[MusicInvite] 系统主动邀约:", from);

    /* 站内通知：页面隐藏时发系统通知；页面可见时浮层已经在响了 */
    const notifyCharacter: "Levi" | "Erwin" =
      from === "Both" ? "Levi" : from;
    notifyRef.current(
      {
        appId: "music",
        character: notifyCharacter,
        title:
          from === "Both" ? "Levi & Erwin" : from,
        body: "邀请你一起听歌",
      },
      { onlySystemIfHidden: true }
    );

    const text = "要不要一起听歌？";

    if (from === "Both") {
      addMessage({
        id: createMessageId(),
        sender: "Levi",
        type: "text",
        text,
        timestamp: Date.now(),
      });
      addMessage({
        id: createMessageId(),
        sender: "Erwin",
        type: "text",
        text,
        timestamp: Date.now() + 1,
      });
    } else {
      addMessage({
        id: createMessageId(),
        sender: from,
        type: "text",
        text,
        timestamp: Date.now(),
      });
    }
  }, [addMessage]);

  /* -------------------------------------------------------
     定时器
     ------------------------------------------------------- */

  useEffect(() => {
    if (partner !== "Solo") return;
    if (systemInvite) return;
    if (music.length === 0) return;

    const lastTime = loadLastInviteTime();
    const now = Date.now();

    let delay: number;
    if (lastTime === 0) {
      delay =
        FIRST_INVITE_MIN_MS +
        Math.random() *
          (FIRST_INVITE_MAX_MS - FIRST_INVITE_MIN_MS);
    } else {
      const earliest = lastTime + SYSTEM_INVITE_MIN_MS;
      const waitMs = Math.max(0, earliest - now);
      const extra =
        Math.random() *
        (SYSTEM_INVITE_MAX_MS - SYSTEM_INVITE_MIN_MS);
      delay = waitMs + extra;
    }

    console.log(
      `[MusicInvite] 系统将在 ${(delay / 60000).toFixed(
        1
      )} 分钟后主动邀约`
    );

    const timer = window.setTimeout(() => {
      triggerInvite();
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [partner, systemInvite, music.length, triggerInvite]);

  /* 倒计时 */
  useEffect(() => {
    if (!systemInvite) {
      setRemaining(0);
      return;
    }
    function tick() {
      const left = Math.max(
        0,
        Math.ceil(
          (systemInvite!.expiresAt - Date.now()) / 1000
        )
      );
      setRemaining(left);
      if (left <= 0) {
        console.log("[MusicInvite] 系统邀约过期");
        clearPendingInvite();
        setSystemInvite(null);
      }
    }
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [systemInvite]);

  /* -------------------------------------------------------
     accept / decline
     ------------------------------------------------------- */

  const accept = useCallback(() => {
    const inv = systemInviteRef.current;
    if (!inv) return;
    const from = inv.from;

    clearPendingInvite();
    setSystemInvite(null);

    saveListenPartner(from);

    addMessage({
      id: createMessageId(),
      sender: "You",
      type: "text",
      text: "好啊。",
      timestamp: Date.now(),
    });

    const delay =
      RANDOM_PLAY_MIN_MS +
      Math.random() * (RANDOM_PLAY_MAX_MS - RANDOM_PLAY_MIN_MS);
    console.log(
      `[MusicInvite] 接受，将在 ${(delay / 1000).toFixed(
        1
      )}s 后随机播放`
    );

    window.setTimeout(() => {
      const list = musicRef.current.filter((m) => m.enabled);
      if (list.length === 0) return;
      const pick =
        list[Math.floor(Math.random() * list.length)];
      const idx = musicRef.current.findIndex(
        (m) => m.id === pick.id
      );
      if (idx < 0) return;

      void playTrack(idx);

      const speaker: "Levi" | "Erwin" =
        from === "Both"
          ? Math.random() < 0.5
            ? "Levi"
            : "Erwin"
          : from;

      addMessage({
        id: createMessageId(),
        sender: speaker,
        type: "text",
        text: `那我们听《${pick.title}》吧。`,
        timestamp: Date.now(),
      });
    }, delay);
  }, [addMessage, playTrack]);

  const decline = useCallback(() => {
    const inv = systemInviteRef.current;
    if (!inv) return;
    const from = inv.from;

    clearPendingInvite();
    setSystemInvite(null);

    addMessage({
      id: createMessageId(),
      sender: "You",
      type: "text",
      text: "下次吧。",
      timestamp: Date.now(),
    });

    window.setTimeout(() => {
      const speaker: "Levi" | "Erwin" =
        from === "Both"
          ? Math.random() < 0.5
            ? "Levi"
            : "Erwin"
          : from;
      addMessage({
        id: createMessageId(),
        sender: speaker,
        type: "text",
        text: "好，随时喊我。",
        timestamp: Date.now(),
      });
    }, 1200);
  }, [addMessage]);

  return (
    <MusicInviteContext.Provider
      value={{
        systemInvite,
        remaining,
        triggerNow: triggerInvite,
        accept,
        decline,
      }}
    >
      {children}
    </MusicInviteContext.Provider>
  );
}

export function useMusicInvite() {
  const ctx = useContext(MusicInviteContext);
  if (!ctx) {
    throw new Error(
      "useMusicInvite must be used inside MusicInviteProvider"
    );
  }
  return ctx;
}