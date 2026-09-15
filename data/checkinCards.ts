import type {
  CommentCard,
  TaskCard,
} from "@/data/checkin";

const TASK_CARDS = [
  "今天整理桌面 10 分钟。",
  "今天读 10 页书。",
  "今天喝够 8 杯水。",
  "今天走 3000 步。",
  "今天整理一下书桌。",
  "今天给房间通通风。",
  "今天写一段日记。",
  "今天听一首完整的歌。",
  "今天早点睡。",
  "今天做一次深呼吸练习。",
  "今天整理手机相册。",
  "今天给自己泡杯茶。",
  "今天整理一下明天要做的事。",
  "今天晒太阳 10 分钟。",
  "今天拉伸一下身体。",
  "今天洗一次头发。",
  "今天给植物浇水。",
  "今天读一篇短文。",
  "今天不看手机 30 分钟。",
  "今天给自己做一顿饭。",
  "今天整理钱包。",
  "今天擦一次桌子。",
  "今天清一下桌面通知。",
  "今天出门散一次步。",
];

const LEVI_COMMENTS = [
  "行，做完了就休息。",
  "不错。",
  "做完了就别再折腾。",
  "嗯。",
  "记下了。",
  "好。",
  "完成就行。",
  "别急着做下一件。",
  "嗯，辛苦了。",
  "知道了。",
];

const ERWIN_COMMENTS = [
  "今天辛苦了。",
  "做得不错。",
  "慢慢来就好。",
  "今天也辛苦了。",
  "嗯，记下了。",
  "做完了就好好休息。",
  "这一步走得不错。",
  "明天继续也可以。",
  "不错。",
  "好，做完了。",
];

export const DEFAULT_TASK_CARDS: TaskCard[] =
  TASK_CARDS.map((text, i) => ({
    id: `tcard-default-${i}`,
    text,
    enabled: true,
  }));

export const DEFAULT_COMMENT_CARDS: CommentCard[] = [
  ...LEVI_COMMENTS.map((text, i) => ({
    id: `Levi-cc-default-${i}`,
    character: "Levi" as const,
    text,
    enabled: true,
  })),
  ...ERWIN_COMMENTS.map((text, i) => ({
    id: `Erwin-cc-default-${i}`,
    character: "Erwin" as const,
    text,
    enabled: true,
  })),
];