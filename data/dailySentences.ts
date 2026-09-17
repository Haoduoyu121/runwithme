import type { DailySentence } from "@/data/study";

/* 内置 30 条默认每日一句 */
const DEFAULT_TEXT: {
  text: string;
  source: string;
  lang: "zh" | "en";
}[] = [
  // 中文 15 条
  {
    text: "她的慈悲就像台风的暴风眼，短暂的风平浪静之后，接着又是更猛烈的狂风暴雨。",
    source: "罗伯特·麦卡蒙《大拼图的一小片》",
    lang: "zh",
  },
  {
    text: "费尔南达才不会在乎下雨，因为她的一生本就阴雨不停。",
    source: "加西亚·马尔克斯《百年孤独》",
    lang: "zh",
  },
  {
    text: "全世界的水都会重逢，北冰洋与尼罗河会在湿云中交融。这古老美丽的比喻让此刻变得神圣。即使漫游，每条路也都会带我们归家。",
    source: "赫尔曼·黑塞《克林索尔的最后夏天》",
    lang: "zh",
  },
  {
    text: "不要因为走得太远，忘了我们为什么出发。",
    source: "纪伯伦",
    lang: "zh",
  },
  {
    text: "我知道一颗破碎的心想要恢复的话，狠狠一击和慢慢勒死相比，前者会快得多。",
    source: "戴安娜·阿西尔《暮色将尽》",
    lang: "zh",
  },
  {
    text: "人们应该始终把自己看作第二天就要死亡的人。将您扼杀的就是您以为面前还有无尽的时间。",
    source: "埃尔莎·特丽奥荣《月神园》",
    lang: "zh",
  },
  {
    text: "万物与我都是荒诞的静寂， 此时我想你。",
    source: "佩索阿《我的心迟到了》",
    lang: "zh",
  },
  {
    text: "我们终其一生，就是要摆脱他人的期待，找到真正的自己。",
    source: "伍绮诗《无声告白》",
    lang: "zh",
  },
  {
    text: "上天不给我的，无论我十指怎样紧扣，仍然走漏;给我的，无论过去我怎么失手，都会拥有。",
    source: "三毛《梦里花落知多少里》",
    lang: "zh",
  },
  {
    text: "因为懂得，所以慈悲。",
    source: "张爱玲",
    lang: "zh",
  },
  {
    text: "心之所向，素履以往。",
    source: "七堇年",
    lang: "zh",
  },
  {
    text: "愿你我带着最微薄的行李，和最丰盛的自己，在世界各地旅行。",
    source: "赫尔曼·黑塞",
    lang: "zh",
  },
  {
    text: "只要想起一生中后悔的事，梅花便落满了南山。",
    source: "张枣",
    lang: "zh",
  },
  {
    text: "所有的大人都曾经是小孩，虽然，只有少数的人记得。",
    source: "《小王子》",
    lang: "zh",
  },
  {
    text: "二十五年，四分之一的世纪，即使有雨，也隔着千山万山，千伞万伞。",
    source: "余光中《听听那冷雨》",
    lang: "zh",
  },

  // 英文 15 条
  {
    text: "Ich muß fort, ich muß reisen, ich muß in die Freiheit.我必须离开，必须旅行，我的心必须到自由里去。",
    source: "黑塞",
    lang: "en",
  },
  {
    text: "The only way out is through.",
    source: "Robert Frost",
    lang: "en",
  },
  {
    text: "Not all those who wander are lost.",
    source: "J.R.R. Tolkien",
    lang: "en",
  },
  {
    text: "We accept the love we think we deserve.",
    source: "Stephen Chbosky",
    lang: "en",
  },
  {
    text: "You are what you love, not what loves you.",
    source: "Charlie Kaufman",
    lang: "en",
  },
  {
    text: "Happiness can be found even in the darkest of times, if one only remembers to turn on the light.",
    source: "J.K. Rowling",
    lang: "en",
  },
  {
    text: "The wound is the place where the light enters you.",
    source: "Rumi",
    lang: "en",
  },
  {
    text: "In the middle of winter, I at last discovered that there was in me an invincible summer.",
    source: "Albert Camus",
    lang: "en",
  },
  {
    text: "It does not do to dwell on dreams and forget to live.",
    source: "J.K. Rowling",
    lang: "en",
  },
  {
    text: "What we do in life echoes in eternity.",
    source: "Marcus Aurelius",
    lang: "en",
  },
  {
    text: "The best way to predict the future is to invent it.",
    source: "Alan Kay",
    lang: "en",
  },
  {
    text: "There is no charm equal to tenderness of heart.",
    source: "Jane Austen",
    lang: "en",
  },
  {
    text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    source: "Aristotle",
    lang: "en",
  },
  {
    text: "The only true wisdom is in knowing you know nothing.",
    source: "Socrates",
    lang: "en",
  },
  {
    text: "The best time to plant a tree was 20 years ago. The second best time is now.",
    source: "Chinese Proverb",
    lang: "en",
  },
];

export const DEFAULT_DAILY_SENTENCES: DailySentence[] =
  DEFAULT_TEXT.map((t, i) => ({
    id: `ds-default-${i}`,
    text: t.text,
    source: t.source,
    lang: t.lang,
    enabled: true,
    createdAt: Date.now() + i,
  }));