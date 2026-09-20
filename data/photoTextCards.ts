export type PhotoTextCardSnapshot = {
  author: PhotoTextCardAuthor;
  place: string;
  weather: string;
  person: string;
  action: string;
  mood: string;
};

export function snapshotOf(
  card: PhotoTextCard
): PhotoTextCardSnapshot {
  return {
    author: card.author,
    place: card.place,
    weather: card.weather,
    person: card.person,
    action: card.action,
    mood: card.mood,
  };
}
export type PhotoTextPoolKey =
  | "place"
  | "weather"
  | "person"
  | "action"
  | "mood";

export type PhotoTextPools = {
  place: string[];
  weather: string[];
  person: string[];
  action: string[];
  mood: string[];
};

export const PHOTO_TEXT_POOL_LABELS: Record<
  PhotoTextPoolKey,
  string
> = {
  place: "地点",
  weather: "天气",
  person: "人物",
  action: "行为",
  mood: "情绪",
};

export const PHOTO_TEXT_POOL_ORDER: PhotoTextPoolKey[] = [
  "place",
  "weather",
  "person",
  "action",
  "mood",
];

export const PHOTO_TEXT_POOL_MAX = 50;

export type PhotoTextCardAuthor = "Levi" | "Erwin";

export type PhotoTextCard = {
  id: string;
  author: PhotoTextCardAuthor;
  place: string;
  weather: string;
  person: string;
  action: string;
  mood: string;
  createdAt: number;
  sentToChat?: boolean;
  sentToICity?: boolean;
};

/** 一次"角色拍照"任务：延时 1-3 min 后结算 */
export type PhotoTextPending = {
  id: string;
  resolveAt: number;
  /** 预抽结果（未展示）；空数组 = 没人拍 */
  cards: PhotoTextCard[];
};

export function createPhotoTextCardId(): string {
  return `ptc-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export function createPhotoTextPendingId(): string {
  return `ptp-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export const DEFAULT_PHOTO_TEXT_POOLS: PhotoTextPools = {
  place: [
    "厨房",
    "阳台",
    "客厅",
    "书房",
    "楼下的街",
    "咖啡店",
    "床上",
    "窗边",
    "走廊",
    "车站",
  ],
  weather: [
    "晴天",
    "下了点雨",
    "阴天",
    "风很大",
    "雪刚停",
    "有点闷",
    "空气很凉",
    "阳光正好",
    "起雾了",
  ],
  person: [
    "和 Levi 一起",
    "和 Erwin 一起",
    "他们都在",
    "只有我",
    "和你",
    "一个人",
  ],
  action: [
    "发呆",
    "煮茶",
    "看书",
    "听歌",
    "睡了一觉",
    "走了很久",
    "做饭",
    "写东西",
    "看窗外",
    "整理房间",
  ],
  mood: [
    "平静",
    "想你",
    "开心",
    "疲惫",
    "满足",
    "空",
    "安心",
    "期待",
    "温柔",
    "孤单",
  ],
};