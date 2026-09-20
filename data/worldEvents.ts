export type WorldEventApp =
  | "icity"
  | "photos"
  | "music"
  | "watch"
  | "read"
  | "study"
  | "notes"
  | "checkin";

export type WorldEventActor = "You" | "Levi" | "Erwin";

export type WorldEventType = "post" | "like" | "comment";

export type WorldEvent = {
  id: string;
  app: WorldEventApp;
  type: WorldEventType;
  sourceId?: string;
  actor: WorldEventActor;
  title: string;
  preview?: string;
  timestamp: number;
  meta?: Record<string, unknown>;
};

export type WorldEventDraft = Omit<
  WorldEvent,
  "id" | "timestamp"
> & {
  timestamp?: number;
};

export function createWorldEventId(): string {
  return `we-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}