export type DiaryCharacter = "Levi" | "Erwin";

export type DiaryMoodCard = {
  id: string;
  mood: string;
  enabled: boolean;
};

export type DiaryContentCategory =
  | "opening"
  | "body"
  | "closing";

export type DiaryContentCard = {
  id: string;
  character: DiaryCharacter;
  category: DiaryContentCategory;
  text: string;
  enabled: boolean;
};

export type DiarySchedulerState = {
  lastCheckedAt: number;
  nextCheckAt: number;
};

export function createDiaryMoodCardId(): string {
  return `dm-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export function createDiaryContentCardId(
  character: DiaryCharacter,
  category: DiaryContentCategory
): string {
  return `dc-${character}-${category}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

/* ---------- 心情（共用） ---------- */

export const DEFAULT_DIARY_MOODS: DiaryMoodCard[] = [
  { id: "dm-0", mood: "平静", enabled: true },
  { id: "dm-1", mood: "开心", enabled: true },
  { id: "dm-2", mood: "想你", enabled: true },
  { id: "dm-3", mood: "想念", enabled: true },
  { id: "dm-4", mood: "思念", enabled: true },
  { id: "dm-5", mood: "疲惫", enabled: true },
  { id: "dm-6", mood: "低落", enabled: true },
  { id: "dm-7", mood: "期待", enabled: true },
  { id: "dm-8", mood: "思考", enabled: true },
  { id: "dm-9", mood: "烦躁", enabled: true },
  { id: "dm-10", mood: "专注", enabled: true },
  { id: "dm-11", mood: "满意", enabled: true },
  { id: "dm-12", mood: "寂寞", enabled: true },
  { id: "dm-13", mood: "警觉", enabled: true },
  { id: "dm-14", mood: "温柔", enabled: true },
  { id: "dm-15", mood: "失落", enabled: true },
  { id: "dm-16", mood: "好奇", enabled: true },
  { id: "dm-17", mood: "空洞", enabled: true },
  { id: "dm-18", mood: "沉思", enabled: true },
  { id: "dm-19", mood: "骄傲", enabled: true },
  { id: "dm-20", mood: "坚定", enabled: true },
  { id: "dm-21", mood: "感伤", enabled: true },
  { id: "dm-22", mood: "微笑", enabled: true },
  { id: "dm-23", mood: "孤单", enabled: true },
  { id: "dm-24", mood: "释然", enabled: true },
];

/* ---------- 内容（三级 · Levi / Erwin 各一份） ---------- */

export const DEFAULT_DIARY_CONTENTS: DiaryContentCard[] = [
  /* Levi · 开头 */
  { id: "dc-levi-opening-0", character: "Levi", category: "opening", text: "今天", enabled: true },
  { id: "dc-levi-opening-1", character: "Levi", category: "opening", text: "刚才", enabled: true },
  { id: "dc-levi-opening-2", character: "Levi", category: "opening", text: "昨晚", enabled: true },
  { id: "dc-levi-opening-3", character: "Levi", category: "opening", text: "这几天", enabled: true },
  { id: "dc-levi-opening-4", character: "Levi", category: "opening", text: "早上醒来的时候", enabled: true },
  { id: "dc-levi-opening-5", character: "Levi", category: "opening", text: "训练完", enabled: true },
  { id: "dc-levi-opening-6", character: "Levi", category: "opening", text: "睡前", enabled: true },
  { id: "dc-levi-opening-7", character: "Levi", category: "opening", text: "一个人在家的时候", enabled: true },

  /* Levi · 主体 */
  { id: "dc-levi-body-0", character: "Levi", category: "body", text: "训练了很久", enabled: true },
  { id: "dc-levi-body-1", character: "Levi", category: "body", text: "想你了", enabled: true },
  { id: "dc-levi-body-2", character: "Levi", category: "body", text: "有点累", enabled: true },
  { id: "dc-levi-body-3", character: "Levi", category: "body", text: "挺平静的", enabled: true },
  { id: "dc-levi-body-4", character: "Levi", category: "body", text: "翻了会儿书", enabled: true },
  { id: "dc-levi-body-5", character: "Levi", category: "body", text: "睡了很久", enabled: true },
  { id: "dc-levi-body-6", character: "Levi", category: "body", text: "没怎么出门", enabled: true },
  { id: "dc-levi-body-7", character: "Levi", category: "body", text: "心情还不错", enabled: true },
  { id: "dc-levi-body-8", character: "Levi", category: "body", text: "收拾了一下屋子", enabled: true },
  { id: "dc-levi-body-9", character: "Levi", category: "body", text: "泡了茶", enabled: true },

  /* Levi · 结尾 */
  { id: "dc-levi-closing-0", character: "Levi", category: "closing", text: "记得加衣服。", enabled: true },
  { id: "dc-levi-closing-1", character: "Levi", category: "closing", text: "别多想。", enabled: true },
  { id: "dc-levi-closing-2", character: "Levi", category: "closing", text: "等你回来。", enabled: true },
  { id: "dc-levi-closing-3", character: "Levi", category: "closing", text: "就这样吧。", enabled: true },
  { id: "dc-levi-closing-4", character: "Levi", category: "closing", text: "不用回。", enabled: true },
  { id: "dc-levi-closing-5", character: "Levi", category: "closing", text: "早点睡。", enabled: true },

  /* Erwin · 开头 */
  { id: "dc-erwin-opening-0", character: "Erwin", category: "opening", text: "今天", enabled: true },
  { id: "dc-erwin-opening-1", character: "Erwin", category: "opening", text: "刚才", enabled: true },
  { id: "dc-erwin-opening-2", character: "Erwin", category: "opening", text: "昨晚", enabled: true },
  { id: "dc-erwin-opening-3", character: "Erwin", category: "opening", text: "这些天", enabled: true },
  { id: "dc-erwin-opening-4", character: "Erwin", category: "opening", text: "清晨", enabled: true },
  { id: "dc-erwin-opening-5", character: "Erwin", category: "opening", text: "傍晚的时候", enabled: true },
  { id: "dc-erwin-opening-6", character: "Erwin", category: "opening", text: "独自坐着的时候", enabled: true },
  { id: "dc-erwin-opening-7", character: "Erwin", category: "opening", text: "窗外下雨的时候", enabled: true },

  /* Erwin · 主体 */
  { id: "dc-erwin-body-0", character: "Erwin", category: "body", text: "翻到一本旧书", enabled: true },
  { id: "dc-erwin-body-1", character: "Erwin", category: "body", text: "想你了", enabled: true },
  { id: "dc-erwin-body-2", character: "Erwin", category: "body", text: "有些感慨", enabled: true },
  { id: "dc-erwin-body-3", character: "Erwin", category: "body", text: "很平静", enabled: true },
  { id: "dc-erwin-body-4", character: "Erwin", category: "body", text: "写了几页字", enabled: true },
  { id: "dc-erwin-body-5", character: "Erwin", category: "body", text: "听了段老唱片", enabled: true },
  { id: "dc-erwin-body-6", character: "Erwin", category: "body", text: "整理了书架", enabled: true },
  { id: "dc-erwin-body-7", character: "Erwin", category: "body", text: "心里有些牵挂", enabled: true },
  { id: "dc-erwin-body-8", character: "Erwin", category: "body", text: "喝了杯咖啡", enabled: true },
  { id: "dc-erwin-body-9", character: "Erwin", category: "body", text: "想起了些旧事", enabled: true },

  /* Erwin · 结尾 */
  { id: "dc-erwin-closing-0", character: "Erwin", category: "closing", text: "记得照顾好自己。", enabled: true },
  { id: "dc-erwin-closing-1", character: "Erwin", category: "closing", text: "等见到你再细说。", enabled: true },
  { id: "dc-erwin-closing-2", character: "Erwin", category: "closing", text: "愿你安好。", enabled: true },
  { id: "dc-erwin-closing-3", character: "Erwin", category: "closing", text: "就这样吧。", enabled: true },
  { id: "dc-erwin-closing-4", character: "Erwin", category: "closing", text: "不必挂念。", enabled: true },
  { id: "dc-erwin-closing-5", character: "Erwin", category: "closing", text: "夜里风大，记得关窗。", enabled: true },
];