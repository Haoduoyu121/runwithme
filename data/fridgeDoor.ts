export type FridgeDoorCharacter = "user" | "levi" | "erwin";
export type FridgeDoorItemKind = "sticker" | "note";

export type FridgeDoorItem = {
  id: string;
  kind: FridgeDoorItemKind;
  owner: FridgeDoorCharacter;
  x: number;
  y: number;
  rotation: number;
  createdAt: number;
  expiresAt?: number;
  imageUrl?: string;
  text?: string;
  colorIdx?: number;
  signature?: string;
  bgColor?: string;
};

export type FridgeCardKind = "sticker" | "note";

export type FridgeCard = {
  id: string;
  owner: "levi" | "erwin";
  kind: FridgeCardKind;
  imageUrl?: string;
  text?: string;
  enabled: boolean;
};

export const NOTE_COLORS = [
  { bg: "#fef3b8", border: "#eadd93", text: "#7a6a2e" },
  { bg: "#fcd0d8", border: "#eeb8c2", text: "#8a4a55" },
  { bg: "#c5e1ee", border: "#a9cbdc", text: "#3a5a6e" },
  { bg: "#cde8d0", border: "#acd2b0", text: "#3a6e40" },
  { bg: "#e5d4eb", border: "#cfb8d8", text: "#5a3a6e" },
];

export const MAX_STICKERS = 5;
export const MAX_NOTES = 7;
export const NOTE_LIFE_MS = 3 * 24 * 60 * 60 * 1000;
export const SYS_CHECK_MIN_MS = 8 * 60 * 60 * 1000;
export const SYS_CHECK_MAX_MS = 16 * 60 * 60 * 1000;
export const SYS_TRIGGER_CHANCE = 0.55;

export function createFridgeDoorItemId(): string {
  return `fd-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function createFridgeCardId(): string {
  return `fc-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export const DEFAULT_FRIDGE_CARDS: FridgeCard[] = [
  {
    id: "fc-l-01",
    owner: "levi",
    kind: "sticker",
    imageUrl: "/fridge-stickers/food_coffee-1.svg",
    enabled: true,
  },
  {
    id: "fc-l-02",
    owner: "levi",
    kind: "sticker",
    imageUrl: "/fridge-stickers/animals_mamals_cat.svg",
    enabled: true,
  },
  {
    id: "fc-l-03",
    owner: "levi",
    kind: "sticker",
    imageUrl: "/fridge-stickers/food_egg_2_color.svg",
    enabled: true,
  },
  {
    id: "fc-l-04",
    owner: "levi",
    kind: "note",
    text: "别忘了吃饭",
    enabled: true,
  },
  {
    id: "fc-l-05",
    owner: "levi",
    kind: "note",
    text: "别熬夜",
    enabled: true,
  },
  {
    id: "fc-l-06",
    owner: "levi",
    kind: "note",
    text: "天冷了，多穿点",
    enabled: true,
  },
  {
    id: "fc-e-01",
    owner: "erwin",
    kind: "sticker",
    imageUrl: "/fridge-stickers/food_cup.svg",
    enabled: true,
  },
  {
    id: "fc-e-02",
    owner: "erwin",
    kind: "sticker",
    imageUrl: "/fridge-stickers/nature_cloud_1_face.svg",
    enabled: true,
  },
  {
    id: "fc-e-03",
    owner: "erwin",
    kind: "sticker",
    imageUrl: "/fridge-stickers/food_milk_01_color.svg",
    enabled: true,
  },
  {
    id: "fc-e-04",
    owner: "erwin",
    kind: "note",
    text: "明天也要好好吃饭",
    enabled: true,
  },
  {
    id: "fc-e-05",
    owner: "erwin",
    kind: "note",
    text: "我在",
    enabled: true,
  },
  {
    id: "fc-e-06",
    owner: "erwin",
    kind: "note",
    text: "早点回来",
    enabled: true,
  },
];