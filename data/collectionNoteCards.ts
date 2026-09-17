/* =========================================================
   RunWithme · Collection Note Cards
   系统收藏时写备注用的专用卡池
   ========================================================= */

export type CollectionNoteOwner = "levi" | "erwin" | "both";

export type CollectionNoteCard = {
  id: string;
  text: string;
  enabled: boolean;
  owner: CollectionNoteOwner;
};

export function createCollectionNoteCardId(): string {
  return `cnc-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/* ---------- 默认卡池 ---------- */

export const DEFAULT_COLLECTION_NOTE_CARDS: CollectionNoteCard[] =
  [
    /* 通用 —— Levi / Erwin 都能用 */
    {
      id: "cnc-default-1",
      text: "这条我想留着。",
      enabled: true,
      owner: "both",
    },
    {
      id: "cnc-default-2",
      text: "以后再看，也不错的。",
      enabled: true,
      owner: "both",
    },
    {
      id: "cnc-default-3",
      text: "我记住了。",
      enabled: true,
      owner: "both",
    },
    {
      id: "cnc-default-4",
      text: "当时看到这句，停了一下。",
      enabled: true,
      owner: "both",
    },
    {
      id: "cnc-default-5",
      text: "存一下。",
      enabled: true,
      owner: "both",
    },

    /* Levi 专属 */
    {
      id: "cnc-default-levi-1",
      text: "你说的这句，我一直记着。",
      enabled: true,
      owner: "levi",
    },
    {
      id: "cnc-default-levi-2",
      text: "别删。",
      enabled: true,
      owner: "levi",
    },
    {
      id: "cnc-default-levi-3",
      text: "看得出来你当时是认真的。",
      enabled: true,
      owner: "levi",
    },
    {
      id: "cnc-default-levi-4",
      text: "有点傻，但我喜欢。",
      enabled: true,
      owner: "levi",
    },
    {
      id: "cnc-default-levi-5",
      text: "留作以后算账用。",
      enabled: true,
      owner: "levi",
    },

    /* Erwin 专属 */
    {
      id: "cnc-default-erwin-1",
      text: "这句我记下了。",
      enabled: true,
      owner: "erwin",
    },
    {
      id: "cnc-default-erwin-2",
      text: "值得记一笔。",
      enabled: true,
      owner: "erwin",
    },
    {
      id: "cnc-default-erwin-3",
      text: "你写下的时候，应该有些犹豫吧。",
      enabled: true,
      owner: "erwin",
    },
    {
      id: "cnc-default-erwin-4",
      text: "我喜欢这段，留着。",
      enabled: true,
      owner: "erwin",
    },
    {
      id: "cnc-default-erwin-5",
      text: "会想起这句的。",
      enabled: true,
      owner: "erwin",
    },
  ];