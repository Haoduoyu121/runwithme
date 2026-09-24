/* RunWithme 塔罗牌数据 - 默认 78 张 Rider-Waite */

export type TarotSuit = "wands" | "cups" | "swords" | "pentacles";

export type TarotCard = {
  id: string;      // "00" ~ "77"
  num: number;
  name: string;
  nameCn: string;
  arcana: "major" | "minor";
  suit?: TarotSuit;
  upright: string;
  reversed: string;
  symbol: string;
};

const MAJOR_RAW: Omit<TarotCard, "id" | "num" | "arcana">[] = [
  { name: "The Fool", nameCn: "愚者", symbol: "✦",
    upright: "新的开始、冒险、天真、自由。放下顾虑，迈出第一步。",
    reversed: "鲁莽、逃避、犹豫不决。先看清脚下的路。" },
  { name: "The Magician", nameCn: "魔术师", symbol: "⚗",
    upright: "创造力、行动力、掌握资源。你拥有改变现状的能力。",
    reversed: "欺骗、操控、才华被浪费。警惕虚假承诺。" },
  { name: "The High Priestess", nameCn: "女祭司", symbol: "☽",
    upright: "直觉、潜意识、内在智慧。答案在安静处等待。",
    reversed: "忽视直觉、秘密被隐瞒。留意被压抑的感受。" },
  { name: "The Empress", nameCn: "女皇", symbol: "❀",
    upright: "丰饶、母性、感官愉悦。允许自己被滋养。",
    reversed: "过度依赖、创造力受阻。先照顾自己。" },
  { name: "The Emperor", nameCn: "皇帝", symbol: "♛",
    upright: "秩序、权威、稳定。用理性与规则掌控局面。",
    reversed: "专横、僵化、控制欲。规则不该压垮人。" },
  { name: "The Hierophant", nameCn: "教皇", symbol: "✝",
    upright: "传统、信仰、导师。寻求指引，遵循既有智慧。",
    reversed: "叛逆、打破规则。旧路走不通，需另辟蹊径。" },
  { name: "The Lovers", nameCn: "恋人", symbol: "♡",
    upright: "爱情、结合、重要的选择。跟随内心。",
    reversed: "关系失衡、价值冲突。先弄清楚自己要什么。" },
  { name: "The Chariot", nameCn: "战车", symbol: "⚔",
    upright: "意志、胜利、前进。控制方向，勇往直前。",
    reversed: "失控、方向不明。先停下来辨别方向。" },
  { name: "Strength", nameCn: "力量", symbol: "∞",
    upright: "勇气、耐心、温柔的力量。以柔克刚。",
    reversed: "自我怀疑、内耗。温柔首先是对自己。" },
  { name: "The Hermit", nameCn: "隐者", symbol: "☾",
    upright: "独处、内省、寻找答案。暂时退后，看清自己。",
    reversed: "孤立、逃避社交。孤独过了头就是牢笼。" },
  { name: "Wheel of Fortune", nameCn: "命运之轮", symbol: "☸",
    upright: "转变、循环、机遇。命运正在转动。",
    reversed: "坏运气、失控。循环总有下一轮。" },
  { name: "Justice", nameCn: "正义", symbol: "⚖",
    upright: "公平、真相、因果。接受并承担。",
    reversed: "不公、逃避责任。看看你做了什么。" },
  { name: "The Hanged Man", nameCn: "倒吊人", symbol: "⌖",
    upright: "换视角、等待、牺牲。停一下，会有新发现。",
    reversed: "拖延、无谓牺牲。该动了。" },
  { name: "Death", nameCn: "死神", symbol: "☠",
    upright: "结束、转变、重生。放下旧的，才有新的。",
    reversed: "抗拒改变、停滞。抓住不放只会更痛。" },
  { name: "Temperance", nameCn: "节制", symbol: "⚗",
    upright: "平衡、调和、耐心。慢一点，混得刚好。",
    reversed: "失衡、极端。找找生活的支点。" },
  { name: "The Devil", nameCn: "恶魔", symbol: "☭",
    upright: "束缚、欲望、阴暗面。你被什么绑住了？",
    reversed: "挣脱、觉醒。枷锁其实可以解开。" },
  { name: "The Tower", nameCn: "塔", symbol: "⌂",
    upright: "崩塌、突变、真相爆发。基础不稳，就该重建。",
    reversed: "勉强维持、内爆。迟早要面对。" },
  { name: "The Star", nameCn: "星星", symbol: "★",
    upright: "希望、灵感、疗愈。抬头，光还在那里。",
    reversed: "失望、信心动摇。再等等。" },
  { name: "The Moon", nameCn: "月亮", symbol: "☾",
    upright: "幻觉、潜意识、不安。不是所有东西都是表面那样。",
    reversed: "真相浮现、恐惧消退。雾正在散。" },
  { name: "The Sun", nameCn: "太阳", symbol: "☀",
    upright: "喜悦、成功、光明。今天值得笑出来。",
    reversed: "暂时的阴云。太阳还在，只是被挡了一下。" },
  { name: "Judgement", nameCn: "审判", symbol: "✞",
    upright: "觉醒、召唤、重生。是时候回应那个声音了。",
    reversed: "自我怀疑、逃避决断。答案你早就知道。" },
  { name: "The World", nameCn: "世界", symbol: "◎",
    upright: "完成、圆满、整合。一个循环结束了。",
    reversed: "未完成、收尾拖延。只差最后一步。" },
];

const SUITS: { id: TarotSuit; name: string; nameCn: string; symbol: string }[] = [
  { id: "wands", name: "Wands", nameCn: "权杖", symbol: "❦" },
  { id: "cups", name: "Cups", nameCn: "圣杯", symbol: "♢" },
  { id: "swords", name: "Swords", nameCn: "宝剑", symbol: "⚔" },
  { id: "pentacles", name: "Pentacles", nameCn: "钱币", symbol: "❖" },
];

const SUIT_UP: Record<TarotSuit, string> = {
  wands: "行动、热情、创造力",
  cups: "情感、关系、直觉",
  swords: "思维、冲突、真相",
  pentacles: "物质、工作、稳定",
};

const SUIT_REV: Record<TarotSuit, string> = {
  wands: "冲动、停滞、热情消退",
  cups: "情感失衡、压抑、疏离",
  swords: "思虑过度、沟通受阻",
  pentacles: "财务压力、失去根基",
};

const RANKS: { id: string; name: string; nameCn: string; up: string; rev: string }[] = [
  { id: "ace", name: "Ace", nameCn: "首牌", up: "新的开始、纯粹的能量", rev: "机会被错过" },
  { id: "two", name: "Two", nameCn: "二", up: "二元、选择、平衡", rev: "犹豫不决" },
  { id: "three", name: "Three", nameCn: "三", up: "初步成果、合作", rev: "合作破裂" },
  { id: "four", name: "Four", nameCn: "四", up: "稳定、停留、基础", rev: "僵持、停滞" },
  { id: "five", name: "Five", nameCn: "五", up: "冲突、失去、考验", rev: "逐渐恢复" },
  { id: "six", name: "Six", nameCn: "六", up: "和谐、给予、过渡", rev: "不平衡" },
  { id: "seven", name: "Seven", nameCn: "七", up: "评估、坚持、策略", rev: "动摇、放弃" },
  { id: "eight", name: "Eight", nameCn: "八", up: "前进、加速、专注", rev: "延迟、原地打转" },
  { id: "nine", name: "Nine", nameCn: "九", up: "接近完成、独立", rev: "孤独、焦虑" },
  { id: "ten", name: "Ten", nameCn: "十", up: "圆满、结果、新循环", rev: "负担、未完成" },
  { id: "page", name: "Page", nameCn: "侍者", up: "好奇、学习、讯息", rev: "不成熟" },
  { id: "knight", name: "Knight", nameCn: "骑士", up: "行动、追求、忠诚", rev: "鲁莽、冲动" },
  { id: "queen", name: "Queen", nameCn: "皇后", up: "内化、滋养、掌握", rev: "情绪化" },
  { id: "king", name: "King", nameCn: "国王", up: "掌控、成熟、责任", rev: "专断、僵化" },
];

function buildMinor(): Omit<TarotCard, "id" | "num">[] {
  const out: Omit<TarotCard, "id" | "num">[] = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      out.push({
        name: `${r.name} of ${s.name}`,
        nameCn: `${s.nameCn}${r.nameCn}`,
        arcana: "minor",
        suit: s.id,
        upright: `${r.up}（${SUIT_UP[s.id]}）`,
        reversed: `${r.rev}（${SUIT_REV[s.id]}）`,
        symbol: s.symbol,
      });
    }
  }
  return out;
}

function assemble(): TarotCard[] {
  const out: TarotCard[] = [];
  let n = 0;
  for (const c of MAJOR_RAW) {
    out.push({ id: String(n).padStart(2, "0"), num: n, arcana: "major", ...c });
    n++;
  }
  for (const c of buildMinor()) {
    out.push({ id: String(n).padStart(2, "0"), num: n, ...c });
    n++;
  }
  return out;
}

export const DEFAULT_TAROT_DECK: TarotCard[] = assemble();

export const DEFAULT_DECK_ID = "default-rws";
export const DEFAULT_DECK_NAME = "Rider-Waite";
export const DEFAULT_IMAGE_DIR = "/tarot/default";

export function cardImagePath(cardId: string, dir = DEFAULT_IMAGE_DIR): string {
  /* cardId 是 "00" ~ "77"，转成 "0" ~ "77"（去前导零） */
  const n = String(parseInt(cardId, 10));
  return `${dir}/${n}.jpeg`;
}

export function getCardById(id: string): TarotCard | undefined {
  return DEFAULT_TAROT_DECK.find((c) => c.id === id);
}