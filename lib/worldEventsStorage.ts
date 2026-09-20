import type {
  WorldEvent,
  WorldEventDraft,
} from "@/data/worldEvents";
import { createWorldEventId } from "@/data/worldEvents";

const EVENTS_KEY = "runwithme_world_events_v1";
const SEEN_KEY = "runwithme_world_events_seen_v1";
const MAX_EVENTS = 500;
const MAX_SEEN = 2000;

export const WORLD_EVENT_DISPATCH =
  "runwithme:world-event";

export function loadWorldEvents(): WorldEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e) =>
        e &&
        typeof e.id === "string" &&
        typeof e.app === "string" &&
        typeof e.type === "string" &&
        typeof e.title === "string" &&
        typeof e.timestamp === "number"
    );
  } catch {
    return [];
  }
}

export function saveWorldEvents(
  list: WorldEvent[]
): void {
  if (typeof window === "undefined") return;
  const trimmed =
    list.length > MAX_EVENTS
      ? list.slice(0, MAX_EVENTS)
      : list;
  try {
    window.localStorage.setItem(
      EVENTS_KEY,
      JSON.stringify(trimmed)
    );
  } catch (e) {
    console.error("[worldEvents] 保存失败:", e);
  }
}

export function emitWorldEvent(
  draft: WorldEventDraft
): WorldEvent | null {
  if (typeof window === "undefined") return null;

  const event: WorldEvent = {
    ...draft,
    id: createWorldEventId(),
    timestamp: draft.timestamp ?? Date.now(),
  };

  const list = loadWorldEvents();
  saveWorldEvents([event, ...list]);

  window.dispatchEvent(
    new CustomEvent(WORLD_EVENT_DISPATCH, {
      detail: event,
    })
  );

  return event;
}

export function loadSeenEventIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter(
        (x): x is string => typeof x === "string"
      )
    );
  } catch {
    return new Set();
  }
}

export function saveSeenEventIds(
  ids: Set<string>
): void {
  if (typeof window === "undefined") return;
  const arr = Array.from(ids);
  const trimmed =
    arr.length > MAX_SEEN ? arr.slice(-MAX_SEEN) : arr;
  try {
    window.localStorage.setItem(
      SEEN_KEY,
      JSON.stringify(trimmed)
    );
  } catch (e) {
    console.error("[worldEvents] seen 保存失败:", e);
  }
}