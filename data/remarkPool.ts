export type RemarkOwner = "Levi" | "Erwin";

export type RemarkPool = Record<RemarkOwner, string[]>;

export const DEFAULT_REMARK_POOL: RemarkPool = {
  Levi: [
    "小狗",
    "笨蛋",
    "小朋友",
    "麻烦精",
    "家里那个",
  ],
  Erwin: [
    "小朋友",
    "辛苦的家伙",
    "珍贵的人",
  ],
};