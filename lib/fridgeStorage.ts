import {
  DEFAULT_DOODLES,
  DEFAULT_FONTS,
  type Doodle,
  type FridgeFonts,
} from "@/data/fridge";

const DOODLES_KEY = "runwithme_fridge_doodles_v1";
const FONTS_KEY = "runwithme_fridge_fonts_v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/* ---------- doodles ---------- */

export function loadDoodles(): Doodle[] {
  if (typeof window === "undefined") return DEFAULT_DOODLES;
  const raw = window.localStorage.getItem(DOODLES_KEY);
  if (!raw) return DEFAULT_DOODLES;
  const parsed = safeParse<unknown>(raw, null);
  if (!Array.isArray(parsed)) return DEFAULT_DOODLES;
  return parsed as Doodle[];
}

function saveDoodles(list: Doodle[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      DOODLES_KEY,
      JSON.stringify(list)
    );
  } catch (e) {
    console.error("[fridgeStorage] 保存失败:", e);
  }
}

export function addDoodle(d: Doodle): Doodle[] {
  const list = loadDoodles();
  const next = [...list, d];
  saveDoodles(next);
  return next;
}

export function updateDoodle(
  id: string,
  patch: Partial<Doodle>
): Doodle[] {
  const list = loadDoodles();
  const next = list.map((d) =>
    d.id === id ? { ...d, ...patch } : d
  );
  saveDoodles(next);
  return next;
}

export function removeDoodle(id: string): Doodle[] {
  const list = loadDoodles();
  const next = list.filter((d) => d.id !== id);
  saveDoodles(next);
  return next;
}

export function replaceDoodles(list: Doodle[]): void {
  saveDoodles(list);
}

/* ---------- fonts ---------- */

export function loadFonts(): FridgeFonts {
  if (typeof window === "undefined") return DEFAULT_FONTS;
  const raw = window.localStorage.getItem(FONTS_KEY);
  return safeParse<FridgeFonts>(raw, DEFAULT_FONTS);
}

export function saveFonts(f: FridgeFonts): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      FONTS_KEY,
      JSON.stringify(f)
    );
  } catch (e) {
    console.error("[fridgeStorage] 字体保存失败:", e);
  }
}

/* ---------- 位置计算 ---------- */

export function computeNextY(doodles: Doodle[]): number {
  if (doodles.length === 0) return 6;
  const maxY = Math.max(...doodles.map((d) => d.y));
  return Math.min(maxY + 14, 78);
}

export function computeNextX(): number {
  return 6 + Math.random() * 12;
}