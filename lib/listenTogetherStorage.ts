import type { Character } from "@/data/cards";

export type ListenPartner = Character | "Both" | "Solo";

const KEY = "runwithme_listen_together";

const VALID: ListenPartner[] = [
  "Solo",
  "Levi",
  "Erwin",
  "Both",
];

export function loadListenPartner(): ListenPartner {
  if (typeof window === "undefined") return "Solo";

  const v = window.localStorage.getItem(KEY);

  if (v && (VALID as string[]).includes(v)) {
    return v as ListenPartner;
  }

  return "Solo";
}

export function saveListenPartner(
  partner: ListenPartner
): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(KEY, partner);
}