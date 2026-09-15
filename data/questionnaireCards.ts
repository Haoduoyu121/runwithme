import type {
  CharacterQuestionCard,
  AnswerCard,
  SystemQuestionCard,
} from "@/data/questionnaire";

function cq(
  character: "Levi" | "Erwin",
  texts: string[]
): CharacterQuestionCard[] {
  return texts.map((text, i) => ({
    id: `${character}-cq-${i}`,
    character,
    text,
    enabled: true,
  }));
}

function ac(
  character: "Levi" | "Erwin",
  texts: string[]
): AnswerCard[] {
  return texts.map((text, i) => ({
    id: `${character}-ac-${i}`,
    character,
    text,
    enabled: true,
  }));
}

function sq(texts: string[]): SystemQuestionCard[] {
  return texts.map((text, i) => ({
    id: `system-sq-${i}`,
    text,
    enabled: true,
  }));
}

/* Levi 主动问 Yui */
const LEVI_QUESTIONS = [
  "你今天最想吃什么？",
  "如果明天完全没有安排，你想怎么过？",
  "今天有没有做什么让你开心的事？",
  "你最近在忙什么？",
  "今天上课累不累？",
  "今天有没有好好吃饭？",
  "最近有没有好好睡觉？",
  "如果现在可以立刻出发，你想去哪里？",
  "今天最想感谢的人是谁？",
  "最近有在做什么让自己开心的事吗？",
  "今天想过偷懒吗？",
  "最近有什么放不下的事情吗？",
];

/* Erwin 主动问 Yui */
const ERWIN_QUESTIONS = [
  "如果明天完全没有安排，你想怎么过？",
  "最近有没有特别想去的地方？",
  "今天最开心的一件事情是什么？",
  "最近有没有特别想做的事情？",
  "你最近睡得还好吗？",
  "有什么是你想尝试但一直没开始的事情吗？",
  "今天想吃什么？",
  "最近有没有让你放不下的事？",
  "今天有没有想对自己说的话？",
  "如果今天可以重新选择，你会做什么？",
  "最近有没有重新开始的打算？",
  "今天有没有什么让你觉得温暖的事情？",
];

/* Levi 的回答 */
const LEVI_ANSWERS = [
  "那就休息。",
  "我不知道。",
  "你自己决定。",
  "随便。",
  "看情况。",
  "你想吃什么就吃什么。",
  "都可以。",
  "没什么特别想做的。",
  "你想做什么都行。",
  "别想太多。",
  "先吃饭。",
  "到时候再说。",
];

/* Erwin 的回答 */
const ERWIN_ANSWERS = [
  "我想，我们还有很多时间。",
  "听起来不错。",
  "让我想想。",
  "你觉得呢？",
  "都可以，我陪你。",
  "不着急，慢慢来。",
  "如果是你想做的，那就去做。",
  "我也这么觉得。",
  "先说说明天想做什么吧。",
  "嗯，我记住了。",
  "只要你开心就好。",
  "我会陪你一起想。",
];

/* 系统问题（每日） */
const SYSTEM_QUESTIONS = [
  "今天最开心的一件事情是什么？",
  "最近有没有特别想去的地方？",
  "如果今天可以重新选择，你会做什么？",
  "今天最想完成什么？",
  "最近有没有让你感到轻松的事情？",
  "今天有没有对自己说什么？",
  "最近有没有什么事让你改变了想法？",
  "今天最想感谢谁？",
  "如果现在可以立刻出发，你想去哪里？",
  "最近有没有什么事是你想坚持的？",
  "今天有没有想记下来的事？",
  "最近有没有什么事让你觉得值得？",
];

export const DEFAULT_CHARACTER_QUESTIONS: CharacterQuestionCard[] =
  [
    ...cq("Levi", LEVI_QUESTIONS),
    ...cq("Erwin", ERWIN_QUESTIONS),
  ];

export const DEFAULT_ANSWER_CARDS: AnswerCard[] = [
  ...ac("Levi", LEVI_ANSWERS),
  ...ac("Erwin", ERWIN_ANSWERS),
];

export const DEFAULT_SYSTEM_QUESTIONS: SystemQuestionCard[] =
  sq(SYSTEM_QUESTIONS);