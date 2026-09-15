const CATEGORIES_KEY = "runwithme_card_categories";

const DEFAULT_CATEGORIES = ["日常", "安慰", "亲密"];

export function loadCategories(): string[] {
  if (typeof window === "undefined") {
    return DEFAULT_CATEGORIES;
  }

  try {
    const raw = window.localStorage.getItem(
      CATEGORIES_KEY
    );

    if (!raw) {
      window.localStorage.setItem(
        CATEGORIES_KEY,
        JSON.stringify(DEFAULT_CATEGORIES)
      );
      return DEFAULT_CATEGORIES;
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return DEFAULT_CATEGORIES;
    }

    const cleaned = parsed
      .filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0
      )
      .map((item) => item.trim());

    return cleaned.length > 0
      ? cleaned
      : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export function saveCategories(cats: string[]): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    CATEGORIES_KEY,
    JSON.stringify(cats)
  );
}