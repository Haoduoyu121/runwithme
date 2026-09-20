export type FridgeCharacter = "user" | "levi" | "erwin";

export type DoodleKind = "text" | "stroke" | "emoji";

export type Doodle = {
  id: string;
  author: FridgeCharacter;
  kind: DoodleKind;
  createdAt: number;
  /** 相对白板百分比 0-100 */
  x: number;
  y: number;
  rotation: number;
  text?: string;
  points?: { x: number; y: number }[];
  emoji?: string;
  imageUrl?: string;
  color?: string;
  width?: number;
};

export type FridgeFonts = {
  user: string;
  levi: string;
  erwin: string;
};

export function createDoodleId(): string {
  return `dl-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export const DEFAULT_FONTS: FridgeFonts = {
  user: "",
  levi: "",
  erwin: "",
};

export const DEFAULT_DOODLES: Doodle[] = [
  {
    id: "dl-init-levi",
    author: "levi",
    kind: "text",
    createdAt: Date.now() - 3600_000,
    x: 8,
    y: 6,
    rotation: -2,
    text: "今天想说的，都写在这儿了。",
  },
  {
    id: "dl-init-erwin",
    author: "erwin",
    kind: "text",
    createdAt: Date.now() - 3000_000,
    x: 14,
    y: 24,
    rotation: 1.5,
    text: "有些话，说给明天听。",
  },
];