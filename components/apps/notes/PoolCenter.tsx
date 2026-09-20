"use client";

import { useMemo, useState } from "react";
import { Plus, RotateCcw, X } from "lucide-react";

import type { WishlistCard } from "@/data/notes";
import {
  createDiaryMoodCardId,
  createDiaryContentCardId,
  DEFAULT_DIARY_MOODS,
  DEFAULT_DIARY_CONTENTS,
  type DiaryCharacter,
  type DiaryMoodCard,
  type DiaryContentCard,
  type DiaryContentCategory,
} from "@/data/diaryCards";
import {
  createHighlightCardId,
  DEFAULT_HIGHLIGHT_CARDS,
  type HighlightCard,
} from "@/data/diaryHighlights";

import WishlistPoolEditor from "./WishlistPoolEditor";

type Props = {
  cards: WishlistCard[];
  onCardsChange: (next: WishlistCard[]) => void;

  moodCards: DiaryMoodCard[];
  onMoodCardsChange: (next: DiaryMoodCard[]) => void;

  contentCards: DiaryContentCard[];
  onContentCardsChange: (next: DiaryContentCard[]) => void;

  highlightCards: HighlightCard[];
  onHighlightCardsChange: (
    next: HighlightCard[]
  ) => void;

  onClose: () => void;
};

type MainTab =
  | "wishlist"
  | "mood"
  | "content"
  | "highlight";

export default function PoolCenter({
  cards,
  onCardsChange,
  moodCards,
  onMoodCardsChange,
  contentCards,
  onContentCardsChange,
  highlightCards,
  onHighlightCardsChange,
  onClose,
}: Props) {
  const [tab, setTab] = useState<MainTab>("wishlist");

  return (
    <div
      className="notes-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="notes-modal notes-pool-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="notes-modal-header">
          <h2>卡池中心</h2>
          <button
            className="notes-modal-close"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>

        <div className="notes-segment notes-pool-tabs">
          <button
            className={tab === "wishlist" ? "active" : ""}
            onClick={() => setTab("wishlist")}
          >
            Wishlist
          </button>
          <button
            className={tab === "mood" ? "active" : ""}
            onClick={() => setTab("mood")}
          >
            心情
          </button>
          <button
            className={tab === "content" ? "active" : ""}
            onClick={() => setTab("content")}
          >
            内容
          </button>
          <button
            className={tab === "highlight" ? "active" : ""}
            onClick={() => setTab("highlight")}
          >
            评价
          </button>
        </div>

        {tab === "wishlist" && (
          <WishlistPoolEditor
            cards={cards}
            onChange={onCardsChange}
            onClose={onClose}
            embedded
          />
        )}

        {tab === "mood" && (
          <DiaryMoodPoolEditor
            moodCards={moodCards}
            onMoodChange={onMoodCardsChange}
          />
        )}

        {tab === "content" && (
          <DiaryContentPoolEditor
            contentCards={contentCards}
            onContentChange={onContentCardsChange}
          />
        )}

        {tab === "highlight" && (
          <DiaryHighlightPoolEditor
            highlightCards={highlightCards}
            onHighlightChange={onHighlightCardsChange}
          />
        )}
      </div>
    </div>
  );
}

/* =========================================================
   心情池（共用）
   ========================================================= */

function DiaryMoodPoolEditor({
  moodCards,
  onMoodChange,
}: {
  moodCards: DiaryMoodCard[];
  onMoodChange: (next: DiaryMoodCard[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function handleAdd() {
    const text = draft.trim();
    if (!text) return;
    const item: DiaryMoodCard = {
      id: createDiaryMoodCardId(),
      mood: text.slice(0, 12),
      enabled: true,
    };
    onMoodChange([...moodCards, item]);
    setDraft("");
  }

  function handleToggle(id: string) {
    onMoodChange(
      moodCards.map((c) =>
        c.id === id ? { ...c, enabled: !c.enabled } : c
      )
    );
  }

  function handleDelete(id: string) {
    onMoodChange(moodCards.filter((c) => c.id !== id));
  }

  function handleRename(id: string, value: string) {
    onMoodChange(
      moodCards.map((c) =>
        c.id === id
          ? { ...c, mood: value.slice(0, 12) }
          : c
      )
    );
  }

  function handleReset() {
    if (
      !window.confirm(
        "恢复默认心情池？（当前修改会丢失）"
      )
    )
      return;
    onMoodChange(DEFAULT_DIARY_MOODS);
  }

  return (
    <>
      <div className="notes-pool-add">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="新增一个心情…"
          maxLength={12}
        />
        <button onClick={handleAdd}>
          <Plus size={14} strokeWidth={2.4} />
        </button>
      </div>

      <div className="notes-pool-list">
        {moodCards.length === 0 ? (
          <div className="notes-pool-empty">
            还没有心情卡
          </div>
        ) : (
          moodCards.map((c) => (
            <div
              key={c.id}
              className={`notes-pool-item${
                c.enabled ? "" : " is-disabled"
              }`}
            >
              <input
                type="text"
                value={c.mood}
                onChange={(e) =>
                  handleRename(c.id, e.target.value)
                }
                maxLength={12}
              />
              <button
                className="notes-pool-toggle"
                onClick={() => handleToggle(c.id)}
              >
                {c.enabled ? "停用" : "启用"}
              </button>
              <button
                className="notes-pool-delete"
                onClick={() => handleDelete(c.id)}
                aria-label="删除"
              >
                <X size={12} strokeWidth={2.4} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="notes-modal-footer">
        <button
          className="notes-list-clear-filter"
          onClick={handleReset}
        >
          <RotateCcw size={12} strokeWidth={2} />
          恢复默认
        </button>
      </div>
    </>
  );
}

/* =========================================================
   内容池（类别 → 角色）
   ========================================================= */

const CATEGORY_LABELS: Record<
  DiaryContentCategory,
  string
> = {
  opening: "开头",
  body: "主体",
  closing: "结尾",
};

const CATEGORY_ORDER: DiaryContentCategory[] = [
  "opening",
  "body",
  "closing",
];

function DiaryContentPoolEditor({
  contentCards,
  onContentChange,
}: {
  contentCards: DiaryContentCard[];
  onContentChange: (next: DiaryContentCard[]) => void;
}) {
  const [category, setCategory] =
    useState<DiaryContentCategory>("opening");
  const [character, setCharacter] =
    useState<DiaryCharacter>("Levi");
  const [draft, setDraft] = useState("");

  const list = useMemo(() => {
    return contentCards.filter(
      (c) =>
        c.character === character &&
        c.category === category
    );
  }, [contentCards, character, category]);

  function handleAdd() {
    const text = draft.trim();
    if (!text) return;
    const item: DiaryContentCard = {
      id: createDiaryContentCardId(
        character,
        category
      ),
      character,
      category,
      text: text.slice(0, 60),
      enabled: true,
    };
    onContentChange([...contentCards, item]);
    setDraft("");
  }

  function handleToggle(id: string) {
    onContentChange(
      contentCards.map((c) =>
        c.id === id ? { ...c, enabled: !c.enabled } : c
      )
    );
  }

  function handleDelete(id: string) {
    onContentChange(
      contentCards.filter((c) => c.id !== id)
    );
  }

  function handleRename(id: string, value: string) {
    onContentChange(
      contentCards.map((c) =>
        c.id === id
          ? { ...c, text: value.slice(0, 60) }
          : c
      )
    );
  }

  function handleReset() {
    if (
      !window.confirm(
        "恢复默认内容池？（当前修改会丢失）"
      )
    )
      return;
    onContentChange(DEFAULT_DIARY_CONTENTS);
  }

  return (
    <>
      <div className="notes-segment notes-pool-tabs">
        {CATEGORY_ORDER.map((cat) => (
          <button
            key={cat}
            className={
              category === cat ? "active" : ""
            }
            onClick={() => setCategory(cat)}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="notes-segment notes-pool-tabs">
        <button
          className={
            character === "Levi" ? "active" : ""
          }
          onClick={() => setCharacter("Levi")}
        >
          Levi
        </button>
        <button
          className={
            character === "Erwin" ? "active" : ""
          }
          onClick={() => setCharacter("Erwin")}
        >
          Erwin
        </button>
      </div>

      <div className="notes-pool-add">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder={`新增一条「${
            CATEGORY_LABELS[category]
          }」…`}
          maxLength={60}
        />
        <button onClick={handleAdd}>
          <Plus size={14} strokeWidth={2.4} />
        </button>
      </div>

      <div className="notes-pool-list">
        {list.length === 0 ? (
          <div className="notes-pool-empty">
            还没有{character}的
            {CATEGORY_LABELS[category]}卡
          </div>
        ) : (
          list.map((c) => (
            <div
              key={c.id}
              className={`notes-pool-item${
                c.enabled ? "" : " is-disabled"
              }`}
            >
              <input
                type="text"
                value={c.text}
                onChange={(e) =>
                  handleRename(c.id, e.target.value)
                }
                maxLength={60}
              />
              <button
                className="notes-pool-toggle"
                onClick={() => handleToggle(c.id)}
              >
                {c.enabled ? "停用" : "启用"}
              </button>
              <button
                className="notes-pool-delete"
                onClick={() => handleDelete(c.id)}
                aria-label="删除"
              >
                <X size={12} strokeWidth={2.4} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="notes-modal-footer">
        <button
          className="notes-list-clear-filter"
          onClick={handleReset}
        >
          <RotateCcw size={12} strokeWidth={2} />
          恢复默认
        </button>
      </div>
    </>
  );
}

/* =========================================================
   评价池（Levi / Erwin）
   ========================================================= */

function DiaryHighlightPoolEditor({
  highlightCards,
  onHighlightChange,
}: {
  highlightCards: HighlightCard[];
  onHighlightChange: (next: HighlightCard[]) => void;
}) {
  const [character, setCharacter] =
    useState<DiaryCharacter>("Levi");
  const [draft, setDraft] = useState("");

  const list = useMemo(
    () =>
      highlightCards.filter(
        (c) => c.character === character
      ),
    [highlightCards, character]
  );

  function handleAdd() {
    const text = draft.trim();
    if (!text) return;
    const item: HighlightCard = {
      id: createHighlightCardId(character),
      character,
      text: text.slice(0, 60),
      enabled: true,
    };
    onHighlightChange([...highlightCards, item]);
    setDraft("");
  }

  function handleToggle(id: string) {
    onHighlightChange(
      highlightCards.map((c) =>
        c.id === id ? { ...c, enabled: !c.enabled } : c
      )
    );
  }

  function handleDelete(id: string) {
    onHighlightChange(
      highlightCards.filter((c) => c.id !== id)
    );
  }

  function handleRename(id: string, value: string) {
    onHighlightChange(
      highlightCards.map((c) =>
        c.id === id
          ? { ...c, text: value.slice(0, 60) }
          : c
      )
    );
  }

  function handleReset() {
    if (
      !window.confirm(
        "恢复默认评价池？（当前修改会丢失）"
      )
    )
      return;
    onHighlightChange(DEFAULT_HIGHLIGHT_CARDS);
  }

  return (
    <>
      <div className="notes-segment notes-pool-tabs">
        <button
          className={
            character === "Levi" ? "active" : ""
          }
          onClick={() => setCharacter("Levi")}
        >
          Levi
        </button>
        <button
          className={
            character === "Erwin" ? "active" : ""
          }
          onClick={() => setCharacter("Erwin")}
        >
          Erwin
        </button>
      </div>

      <div className="notes-pool-add">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="新增一条评价…"
          maxLength={60}
        />
        <button onClick={handleAdd}>
          <Plus size={14} strokeWidth={2.4} />
        </button>
      </div>

      <div className="notes-pool-list">
        {list.length === 0 ? (
          <div className="notes-pool-empty">
            还没有{character}的评价卡
          </div>
        ) : (
          list.map((c) => (
            <div
              key={c.id}
              className={`notes-pool-item${
                c.enabled ? "" : " is-disabled"
              }`}
            >
              <input
                type="text"
                value={c.text}
                onChange={(e) =>
                  handleRename(c.id, e.target.value)
                }
                maxLength={60}
              />
              <button
                className="notes-pool-toggle"
                onClick={() => handleToggle(c.id)}
              >
                {c.enabled ? "停用" : "启用"}
              </button>
              <button
                className="notes-pool-delete"
                onClick={() => handleDelete(c.id)}
                aria-label="删除"
              >
                <X size={12} strokeWidth={2.4} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="notes-modal-footer">
        <button
          className="notes-list-clear-filter"
          onClick={handleReset}
        >
          <RotateCcw size={12} strokeWidth={2} />
          恢复默认
        </button>
      </div>
    </>
  );
}