"use client";

import {
  emitWorldEvent,
} from "@/lib/worldEventsStorage";
import {
  cards as defaultCards,
  type CharacterCard,
} from "@/data/cards";
import { loadCards } from "@/lib/storage";

import type {
  WorldEventApp,
  WorldEventActor,
  WorldEventType,
} from "@/data/worldEvents";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://api.yulewin.cn";

const REMOTE_ID_KEY = "runwithme_remote_event_ids_v1";
const MAX_REMOTE_IDS = 300;

/* ---------- 已拉取的 remote id ---------- */

function loadKnownIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(REMOTE_ID_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter((x): x is string => typeof x === "string")
    );
  } catch {
    return new Set();
  }
}

function saveKnownIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  const arr = Array.from(ids);
  const trimmed =
    arr.length > MAX_REMOTE_IDS
      ? arr.slice(-MAX_REMOTE_IDS)
      : arr;
  try {
    window.localStorage.setItem(
      REMOTE_ID_KEY,
      JSON.stringify(trimmed)
    );
  } catch {
    /* ignore */
  }
}

/* ---------- 字段映射 ---------- */

type RemoteEvent = {
  id?: number | string;
  type?: string;
  character?: string;
  content?: {
    text?: string;
    subject?: string;
    body?: string;
  };
  createdAt?: number;
  timestamp?: number;
};

function mapActor(c?: string): WorldEventActor {
  if (!c) return "Levi";
  const l = c.toLowerCase();
  if (l === "levi") return "Levi";
  if (l === "erwin") return "Erwin";
  if (l === "both")
    return Math.random() < 0.5 ? "Levi" : "Erwin";
  return "Levi";
}

function actorName(a: WorldEventActor): string {
  if (a === "Levi") return "Levi";
  if (a === "Erwin") return "Erwin";
  return "他们";
}

function mapType(t?: string): WorldEventType {
  if (t === "music_invite") return "invite-accepted";
  return "post";
}

function mapApp(t?: string): WorldEventApp {
  if (t === "music_invite") return "music";
  return "icity";
}

type Mapped = {
  app: WorldEventApp;
  type: WorldEventType;
  actor: WorldEventActor;
  title: string;
  preview?: string;
  timestamp: number;
  remoteId: string;
};

function mapRemote(e: RemoteEvent): Mapped | null {
  if (e.id === undefined || e.id === null) return null;

  const remoteId = `remote-${e.id}`;
  const actor = mapActor(e.character);
  const name = actorName(actor);
  const app = mapApp(e.type);
  const type = mapType(e.type);
  const timestamp =
    e.createdAt ?? e.timestamp ?? Date.now();

  let title = `${name} 有新动态`;
  let preview: string | undefined;

  if (e.type === "post") {
    title = `${name} 发了条动态`;
    preview = (e.content?.text || "").slice(0, 60);
  } else if (e.type === "letter") {
    title = `${name} 给你写了一封信`;
    preview = e.content?.subject || "";
  } else if (e.type === "highlight") {
    title = `${name} 划了重点`;
    preview = (e.content?.text || "").slice(0, 60);
  } else if (e.type === "music_invite") {
    title = `${name} 邀请你听歌`;
    preview = e.content?.text || "";
  }

  return {
    app,
    type,
    actor,
    title,
    preview,
    timestamp,
    remoteId,
  };
}

/* ---------- 拉取服务器事件 ---------- */

let pulling = false;

export async function pullRemoteEvents(): Promise<number> {
  if (typeof window === "undefined") return 0;
  if (pulling) return 0;
  pulling = true;

  try {
    const res = await fetch(
      `${API_BASE}/api/events?limit=50`,
      { cache: "no-store" }
    );
    if (!res.ok) return 0;

    const json = (await res.json()) as {
      events?: RemoteEvent[];
    };
    const remoteEvents = json?.events ?? [];
    if (!Array.isArray(remoteEvents)) return 0;

    const known = loadKnownIds();
    const nextIds = new Set(known);
    let added = 0;

    for (const r of remoteEvents) {
      const m = mapRemote(r);
      if (!m) continue;
      if (nextIds.has(m.remoteId)) continue;
      nextIds.add(m.remoteId);

      emitWorldEvent({
        app: m.app,
        type: m.type,
        actor: m.actor,
        title: m.title,
        preview: m.preview,
        timestamp: m.timestamp,
        meta: {
          remote: true,
          remoteId: m.remoteId,
        },
      });
      added++;
    }

    saveKnownIds(nextIds);
    return added;
  } catch (e) {
    console.warn("[remoteEvents] 拉取失败:", e);
    return 0;
  } finally {
    pulling = false;
  }
}

/* ---------- 上传字卡到服务器 ---------- */

async function uploadCards(payload: {
  levi: string[];
  erwin: string[];
  shared: string[];
}): Promise<boolean> {
  try {
    const res = await fetch(
      `${API_BASE}/api/sync/cards`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
    return res.ok;
  } catch (e) {
    console.warn("[remoteEvents] 字卡上传失败:", e);
    return false;
  }
}

export async function syncCardsFromLocal(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const all: CharacterCard[] = loadCards(defaultCards);
  const enabled = all.filter(
    (c) =>
      c.enabled &&
      c.type === "text" &&
      typeof c.text === "string" &&
      c.text.trim().length > 0
  );

  const payload = {
    levi: enabled
      .filter((c) => c.character === "Levi")
      .map((c) => c.text.trim()),
    erwin: enabled
      .filter((c) => c.character === "Erwin")
      .map((c) => c.text.trim()),
    shared: enabled
      .filter((c) => c.character === "Shared")
      .map((c) => c.text.trim()),
  };

  if (
    payload.levi.length === 0 &&
    payload.erwin.length === 0 &&
    payload.shared.length === 0
  ) {
    return false;
  }

  return uploadCards(payload);
}