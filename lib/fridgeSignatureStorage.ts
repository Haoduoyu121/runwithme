const KEY = "runwithme_fridge_signatures_v1";

export type FridgeSignatures = {
  levi: string[];
  erwin: string[];
};

export const DEFAULT_SIGNATURES: FridgeSignatures = {
  levi: ["Levi", "利威尔", "小队长", "L"],
  erwin: ["Erwin", "埃尔文", "团长", "E"],
};

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadSignatures(): FridgeSignatures {
  const raw = load<FridgeSignatures>(KEY, DEFAULT_SIGNATURES);
  return {
    levi:
      Array.isArray(raw.levi) && raw.levi.length > 0
        ? raw.levi
        : DEFAULT_SIGNATURES.levi,
    erwin:
      Array.isArray(raw.erwin) && raw.erwin.length > 0
        ? raw.erwin
        : DEFAULT_SIGNATURES.erwin,
  };
}

export function saveSignatures(s: FridgeSignatures): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch (e) {
    console.error("[fridgeSignature] 保存失败:", e);
  }
}

export function resetSignatures(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function pickSignature(
  s: FridgeSignatures,
  owner: "levi" | "erwin"
): string {
  const list = s[owner] ?? [];
  if (list.length === 0)
    return owner === "levi" ? "Levi" : "Erwin";
  return list[Math.floor(Math.random() * list.length)];
}