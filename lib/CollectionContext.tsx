"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  DEFAULT_COLLECTION_TAGS,
  type CollectionItem,
  type CollectionOwner,
  type CollectionSource,
  type CollectionSender,
} from "@/data/collection";

import {
  loadCollections,
  saveCollections,
  loadCollectionTags,
  saveCollectionTags,
  createCollectionId,
  shouldAutoCollect,
  pickRandomOwner,
  shouldAutoNote,
} from "@/lib/collectionStorage";

import {
  loadCollectionNoteCards,
  pickCollectionNoteCard,
} from "@/lib/collectionNoteCardStorage";
/* ---------- 输入类型 ---------- */

export type AddCollectionInput = {
  owner: CollectionOwner;
  source: CollectionSource;
  content: string;
  sourceId?: string | null;
  sender?: CollectionSender | null;
  note?: string;
  tags?: string[];
  originalAt?: number | null;
  meta?: Record<string, unknown>;
};

export type AutoCollectInput = Omit<
  AddCollectionInput,
  "owner"
>;

/* ---------- Context 类型 ---------- */

type CollectionContextValue = {
  items: CollectionItem[];
  tags: string[];
  hydrated: boolean;

  add: (input: AddCollectionInput) => CollectionItem;
  remove: (id: string) => void;
  update: (
    id: string,
    patch: Partial<
      Pick<CollectionItem, "note" | "tags" | "content">
    >
  ) => void;

  setSender: (
    id: string,
    sender: CollectionSender | null
  ) => void;

  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;

  /* 系统自动收藏（1%~5%），返回 null 表示本次没收藏 */
  tryAutoCollect: (
    input: AutoCollectInput
  ) => CollectionItem | null;
};

const CollectionContext =
  createContext<CollectionContextValue | null>(null);

/* ---------- Provider ---------- */

export function CollectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [tags, setTags] = useState<string[]>(
    DEFAULT_COLLECTION_TAGS
  );
  const [hydrated, setHydrated] = useState(false);

  /* 首次加载 */
  useEffect(() => {
    const loaded = loadCollections();
    const loadedTags = loadCollectionTags();

    setItems(loaded);
    if (loadedTags.length > 0) setTags(loadedTags);
    setHydrated(true);
  }, []);

  /* 自动持久化 */
  useEffect(() => {
    if (!hydrated) return;
    saveCollections(items);
  }, [items, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveCollectionTags(tags);
  }, [tags, hydrated]);

  /* ---------- 方法 ---------- */

  const add = useCallback(
    (input: AddCollectionInput): CollectionItem => {
      const item: CollectionItem = {
        id: createCollectionId(),
        owner: input.owner,
        source: input.source,
        sourceId: input.sourceId ?? null,
        content: input.content,
        note: input.note ?? "",
        tags: input.tags ?? [],
        createdAt: Date.now(),
        originalAt: input.originalAt ?? null,
        sender: input.sender ?? null,
        meta: input.meta ?? {},
      };
      setItems((prev) => [item, ...prev]);
      return item;
    },
    []
  );

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const update = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<CollectionItem, "note" | "tags" | "content">
      >
    ) => {
      setItems((prev) =>
        prev.map((x) => (x.id === id ? { ...x, ...patch } : x))
      );
    },
    []
  );

    const setSender = useCallback(
    (id: string, sender: CollectionSender | null) => {
      setItems((prev) =>
        prev.map((x) => (x.id === id ? { ...x, sender } : x))
      );
    },
    []
  );

  const addTag = useCallback((tag: string) => {
    const t = tag.trim();
    if (!t) return;
    setTags((prev) => (prev.includes(t) ? prev : [...prev, t]));
  }, []);

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const tryAutoCollect = useCallback(
    (input: AutoCollectInput): CollectionItem | null => {
      /* 1%~5% 概率，没中就返回 */
      if (!shouldAutoCollect()) return null;

      /* 50/50 归 Levi / Erwin */
      const owner = pickRandomOwner();

      /* 音乐去重：同一个 owner 已经收藏过同一首歌，就不再收藏 */
      if (input.source === "music" && input.meta?.songId) {
        const songId = String(input.meta.songId);
        const exists = items.some(
          (it) =>
            it.owner === owner &&
            it.source === "music" &&
            it.meta?.songId !== undefined &&
            String(it.meta.songId) === songId
        );
        if (exists) return null;
      }

      /* 55% 概率写备注，从卡池抽一条（会按 owner 过滤） */
      let note = "";
      if (shouldAutoNote()) {
        const cards = loadCollectionNoteCards();
        const card = pickCollectionNoteCard(cards, owner);
        if (card) note = card.text;
      }

      return add({ ...input, owner, note });
    },
    [add, items]
  );

  return (
    <CollectionContext.Provider
      value={{
        items,
        tags,
        hydrated,
        add,
        remove,
        update,
        setSender,
        addTag,
        removeTag,
        tryAutoCollect,
      }}
    >
      {children}
    </CollectionContext.Provider>
  );
}

/* ---------- Hook ---------- */

export function useCollection() {
  const ctx = useContext(CollectionContext);
  if (!ctx) {
    throw new Error(
      "useCollection 必须在 CollectionProvider 内使用"
    );
  }
  return ctx;
}