export type ScheduleCardCharacter = "Levi" | "Erwin";

export type ScheduleCard = {
  id: string;
  character: ScheduleCardCharacter;
  text: string;
  enabled: boolean;
};

function make(
  character: ScheduleCardCharacter,
  texts: string[]
): ScheduleCard[] {
  return texts.map((text, i) => ({
    id: `${character}-schedule-${i}`,
    character,
    text,
    enabled: true,
  }));
}

const LEVI = [
  "训练",
  "整理房间",
  "看书",
  "出门走走",
  "清理桌面",
  "检查装备",
  "写报告",
  "泡茶",
  "发呆",
  "洗衣服",
  "整理文件",
  "晒太阳",
  "跑步",
  "补充物资",
  "修理东西",
  "做饭",
  "散步",
  "早睡",
  "听音乐",
  "给花浇水",
  "擦地板",
  "整理书架",
];

const ERWIN = [
  "处理文件",
  "开会",
  "整理思路",
  "读报告",
  "复盘计划",
  "写日记",
  "喝咖啡",
  "看书",
  "巡视一圈",
  "和 Levi 商量事情",
  "整理书桌",
  "散步",
  "冥想",
  "听新闻",
  "写规划",
  "整理照片",
  "写信",
  "早睡",
  "准备明天的材料",
  "给自己泡杯茶",
  "总结今天的收获",
  "看一会儿窗外",
];

export const DEFAULT_SCHEDULE_CARDS: ScheduleCard[] = [
  ...make("Levi", LEVI),
  ...make("Erwin", ERWIN),
];

/* 抽一张（只从 enabled 里） */
export function pickScheduleCard(
  cards: ScheduleCard[],
  character: ScheduleCardCharacter
): ScheduleCard | null {
  const pool = cards.filter(
    (c) => c.enabled && c.character === character
  );
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}