"use client";

import { useEffect, useMemo, useState } from "react";

import { useCollection } from "@/lib/CollectionContext";

import {
  SOURCE_ICONS,
  SOURCE_LABELS,
  OWNER_LABELS,
  type CollectionItem,
  type CollectionOwner,
  type CollectionSender,
} from "@/data/collection";

import CollectionNotePoolEditor from "@/components/apps/collection/CollectionNotePoolEditor";

type TabKey = CollectionOwner;

type CollectionAppProps = {
  onBack: () => void;
};

const TABS: { key: TabKey; label: string }[] = [
  { key: "user", label: "我的收藏" },
  { key: "levi", label: "Levi" },
  { key: "erwin", label: "Erwin" },
];

const SENDER_LABELS: Record<CollectionSender, string> = {
  You: "from You",
  Levi: "from Levi",
  Erwin: "from Erwin",
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/* -------------------------------------------------------
   Card
   ------------------------------------------------------- */

function CollectionCard({
  item,
  onOpen,
}: {
  item: CollectionItem;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className="collection-card"
      onClick={onOpen}
    >
      <div className="collection-card-head">
        <span className="collection-card-source-icon">
          {SOURCE_ICONS[item.source]}
        </span>
        <span className="collection-card-source-label">
          {SOURCE_LABELS[item.source]}
        </span>

        {item.sender && (
          <span className="collection-card-sender">
            {SENDER_LABELS[item.sender]}
          </span>
        )}

        <span className="collection-card-time">
          {formatTime(item.createdAt)}
        </span>
      </div>

      <div className="collection-card-content">
        {item.content}
      </div>

      {item.note && (
        <div className="collection-card-note">
          <span className="collection-card-note-label">
            {item.owner === "user"
              ? "备注"
              : `${OWNER_LABELS[item.owner]}的备注`}
          </span>
          <div className="collection-card-note-text">
            {item.note}
          </div>
        </div>
      )}

      {item.tags.length > 0 && (
        <div className="collection-card-tags">
          {item.tags.map((t) => (
            <span key={t} className="collection-tag">
              {t}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

/* -------------------------------------------------------
   Detail Sheet
   ------------------------------------------------------- */

function CollectionDetailSheet({
  item,
  onClose,
}: {
  item: CollectionItem;
  onClose: () => void;
}) {
  const { tags: allTags, update, remove, addTag } =
    useCollection();

  const [noteDraft, setNoteDraft] = useState(item.note);
  const [tagDraft, setTagDraft] = useState("");

  useEffect(() => {
    setNoteDraft(item.note);
    setTagDraft("");
  }, [item.id, item.note]);

  function commitNote() {
    if (noteDraft !== item.note) {
      update(item.id, { note: noteDraft });
    }
  }

  function setSender(next: CollectionSender | null) {
    /* update 只接受 note/tags/content，所以直接遍历 context 里的 items ——
       这里用 update 扩展不太方便，走 meta 通道 */
    /* 简化：用 update 接口扩展，我们改天把 update 扩展为接受 sender */
    /* 用 CollectionContext 的 update + 临时把 sender 塞进 meta 不是好方案；
       直接调用一个专门的 setSender 方法（下方给 Context 加） */
    setSenderField(item.id, next);
  }

  /* 因为 Context 里 update 只处理 note/tags/content，
     这里用一个本地包装函数直接修改 sender —— 需要在 Context 里加一个 setSender 方法 */
  const { setSender: setSenderField } = useCollection() as ReturnType<
    typeof useCollection
  > & {
    setSender: (
      id: string,
      sender: CollectionSender | null
    ) => void;
  };

  function addItemTag(raw: string) {
    const t = raw.trim();
    if (!t) return;
    if (item.tags.includes(t)) {
      setTagDraft("");
      return;
    }
    addTag(t);
    update(item.id, { tags: [...item.tags, t] });
    setTagDraft("");
  }

  function removeItemTag(t: string) {
    update(item.id, {
      tags: item.tags.filter((x) => x !== t),
    });
  }

  function handleDelete() {
    if (!window.confirm("删除这条收藏？")) return;
    remove(item.id);
    onClose();
  }

  const availableTags = allTags.filter(
    (t) => !item.tags.includes(t)
  );

  const senderOptions: {
    key: CollectionSender | null;
    label: string;
  }[] = [
    { key: null, label: "不指定" },
    { key: "You", label: "You" },
    { key: "Levi", label: "Levi" },
    { key: "Erwin", label: "Erwin" },
  ];

  return (
    <div
      className="collection-sheet-backdrop"
      onClick={onClose}
    >
      <div
        className="collection-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="collection-sheet-handle" />

        <div className="collection-sheet-header">
          <div className="collection-sheet-meta">
            <span className="collection-sheet-source-icon">
              {SOURCE_ICONS[item.source]}
            </span>
            <span className="collection-sheet-source-label">
              {SOURCE_LABELS[item.source]}
            </span>
            <span className="collection-sheet-owner">
              {OWNER_LABELS[item.owner]}
            </span>
            <span className="collection-sheet-time">
              {formatTime(item.originalAt ?? item.createdAt)}
            </span>
          </div>
          <button
            className="collection-sheet-close"
            onClick={onClose}
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div className="collection-sheet-body">
          <div className="collection-sheet-content">
            {item.content}
          </div>

          {/* 来源 */}
          <div className="collection-sheet-section">
            <label className="collection-sheet-label">
              来源
            </label>
            <div className="collection-sheet-sender-row">
              {senderOptions.map((opt) => (
                <button
                  key={opt.key ?? "none"}
                  type="button"
                  className={
                    item.sender === opt.key
                      ? "collection-sender-pill active"
                      : "collection-sender-pill"
                  }
                  onClick={() => setSender(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 备注 */}
          <div className="collection-sheet-section">
            <label className="collection-sheet-label">
              备注
            </label>
            <textarea
              className="collection-sheet-note"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onBlur={commitNote}
              placeholder={
                item.owner === "user"
                  ? "写点什么…"
                  : `${OWNER_LABELS[item.owner]} 的备注`
              }
            />
          </div>

          {/* 标签 */}
          <div className="collection-sheet-section">
            <label className="collection-sheet-label">
              标签
            </label>

            {item.tags.length > 0 && (
              <div className="collection-sheet-tags">
                {item.tags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="collection-tag-pill"
                    onClick={() => removeItemTag(t)}
                  >
                    {t} ×
                  </button>
                ))}
              </div>
            )}

            <input
              className="collection-sheet-tag-input"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              placeholder="输入标签后回车…"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItemTag(tagDraft);
                }
              }}
            />

            {availableTags.length > 0 && (
              <div className="collection-sheet-tag-pool">
                {availableTags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="collection-tag-pill ghost"
                    onClick={() => addItemTag(t)}
                  >
                    {t} +
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="collection-sheet-footer">
          <button
            className="collection-sheet-delete"
            onClick={handleDelete}
          >
            删除收藏
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   Main
   ------------------------------------------------------- */

export default function CollectionApp({
  onBack,
}: CollectionAppProps) {
  const { items, hydrated } = useCollection();
  const [tab, setTab] = useState<TabKey>("user");
  const [openId, setOpenId] = useState<string | null>(null);
  const [showPoolEditor, setShowPoolEditor] = useState(false);

  const filtered = useMemo(
    () => items.filter((x) => x.owner === tab),
    [items, tab]
  );

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      user: 0,
      levi: 0,
      erwin: 0,
    };
    for (const it of items) c[it.owner] += 1;
    return c;
  }, [items]);

  useEffect(() => {
    if (openId && !items.some((x) => x.id === openId)) {
      setOpenId(null);
    }
  }, [items, openId]);

  const openItem = openId
    ? items.find((x) => x.id === openId) ?? null
    : null;

  return (
    <main className="collection-app">
      <header className="collection-header">
        <button
          className="collection-back"
          onClick={onBack}
          aria-label="返回"
        >
          ‹
        </button>

        <div className="collection-header-center">
          <div className="collection-header-title">
            Collection
          </div>
          <div className="collection-header-sub">
            little things we keep
          </div>
        </div>

        <button
          className="collection-settings-btn"
          onClick={() => setShowPoolEditor(true)}
          aria-label="设置"
        >
          ⚙
        </button>
      </header>

      <nav className="collection-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={
              tab === t.key
                ? "collection-tab active"
                : "collection-tab"
            }
            onClick={() => setTab(t.key)}
          >
            <span>{t.label}</span>
            {counts[t.key] > 0 && (
              <span className="collection-tab-count">
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="collection-scroll">
        {!hydrated ? (
          <div className="collection-empty">
            <div className="collection-empty-icon">…</div>
            <div className="collection-empty-title">
              正在加载
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="collection-empty">
            <div className="collection-empty-icon">★</div>
            <div className="collection-empty-title">
              还没有收藏
            </div>
            <div className="collection-empty-desc">
              {tab === "user"
                ? "在 Chat / iCity / Q&A / Letter 里长按内容，就能收藏到这里。"
                : `${OWNER_LABELS[tab]} 还没有收藏任何东西。`}
            </div>
          </div>
        ) : (
          <div className="collection-list">
            {filtered.map((item) => (
              <CollectionCard
                key={item.id}
                item={item}
                onOpen={() => setOpenId(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {openItem && (
        <CollectionDetailSheet
          item={openItem}
          onClose={() => setOpenId(null)}
        />
      )}

      {showPoolEditor && (
        <CollectionNotePoolEditor
          onClose={() => setShowPoolEditor(false)}
        />
      )}
    </main>
  );
}