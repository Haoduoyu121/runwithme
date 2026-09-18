"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ChevronLeft,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import {
  collectAllTags,
  createNoteId,
  createWishlistItemId,
  formatNoteTime,
  getNoteDisplayTitle,
  getNotePreview,
  getNoteTagPreview,
  normalizeTag,
  type Note,
  type WishlistCard,
  type WishlistItem,
} from "@/data/notes";

import { pickWishlistCard } from "@/data/wishlistCards";

import {
  loadNotes,
  loadWishlist,
  loadWishlistCards,
  saveNotes,
  saveWishlist,
  saveWishlistCards,
} from "@/lib/notesStorage";

import WishlistPoolEditor from "@/components/apps/notes/WishlistPoolEditor";
import { useCollection } from "@/lib/CollectionContext";
import {
  useCharacterAvatars,
  toAvatarKey,
} from "@/lib/useCharacterAvatars";

type NotesAppProps = {
  onBack: () => void;
};

export default function NotesApp({
  onBack,
}: NotesAppProps) {
  const { tryAutoCollect } = useCollection();
  const avatars = useCharacterAvatars();

  const autoCollectedNoteRef = useRef<Set<string>>(
    new Set()
  );

  const [notes, setNotes] = useState<Note[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>(
    []
  );
  const [cards, setCards] = useState<WishlistCard[]>([]);

  const [editingNoteId, setEditingNoteId] = useState<
    string | null
  >(null);

  const [showWishInput, setShowWishInput] = useState(false);
  const [wishInput, setWishInput] = useState("");
  const [editingWishId, setEditingWishId] = useState<
    string | null
  >(null);

  const [showPoolEditor, setShowPoolEditor] =
    useState(false);

  const [tagFilter, setTagFilter] = useState<string | null>(
    null
  );
  const [tagDraft, setTagDraft] = useState("");

  /* ---------- 初始化 ---------- */

  useEffect(() => {
    setNotes(loadNotes());
    setWishlist(loadWishlist());
    setCards(loadWishlistCards());
  }, []);

  useEffect(() => {
    function onKb(e: Event) {
      const detail = (
        e as CustomEvent<{ inset: number }>
      ).detail;
      if (!detail || detail.inset <= 0) return;
      if (!editingNoteId) return;

      requestAnimationFrame(() => {
        const el = document.querySelector(
          ".notes-editor-content"
        );
        if (el && el instanceof HTMLElement) {
          el.scrollIntoView({
            block: "end",
            behavior: "auto",
          });
        }
      });
    }

    window.addEventListener("runwithme:kb-change", onKb);
    return () => {
      window.removeEventListener(
        "runwithme:kb-change",
        onKb
      );
    };
  }, [editingNoteId]);

  function commitNotes(next: Note[]) {
    setNotes(next);
    saveNotes(next);
  }

  function commitWishlist(next: WishlistItem[]) {
    setWishlist(next);
    saveWishlist(next);
  }

  function commitCards(next: WishlistCard[]) {
    setCards(next);
    saveWishlistCards(next);
  }

  /* ---------- Notes CRUD ---------- */

  function createNote() {
    const note: Note = {
      id: createNoteId(),
      title: "",
      body: "",
      tags: tagFilter ? [tagFilter] : [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    commitNotes([note, ...notes]);
    setEditingNoteId(note.id);
  }

  function updateNote(id: string, patch: Partial<Note>) {
    const next = notes.map((n) =>
      n.id === id
        ? { ...n, ...patch, updatedAt: Date.now() }
        : n
    );
    commitNotes(next);

    const updated = next.find((n) => n.id === id);
    if (
      updated &&
      !autoCollectedNoteRef.current.has(id) &&
      (updated.title.trim() || updated.body.trim())
    ) {
      autoCollectedNoteRef.current.add(id);
      tryAutoCollect({
        source: "notes",
        sourceId: id,
        content:
          updated.title.trim() ||
          updated.body.trim().slice(0, 100),
        sender: "You",
        originalAt: Date.now(),
        meta: {
          title: updated.title,
          tagCount: updated.tags.length,
        },
      });
    }
  }

  function deleteNote(id: string) {
    commitNotes(notes.filter((n) => n.id !== id));
    if (editingNoteId === id) setEditingNoteId(null);
  }

  function closeEditor() {
    const note = notes.find((n) => n.id === editingNoteId);
    if (
      note &&
      !note.title.trim() &&
      !note.body.trim() &&
      note.tags.length === 0
    ) {
      commitNotes(
        notes.filter((n) => n.id !== editingNoteId)
      );
    }
    setEditingNoteId(null);
  }

  /* ---------- 标签 ---------- */

  const allTags = useMemo(
    () => collectAllTags(notes),
    [notes]
  );

  function addTagToNote(noteId: string, raw: string) {
    const t = normalizeTag(raw);
    if (!t) return;

    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    if (note.tags.includes(t)) return;

    updateNote(noteId, {
      tags: [...note.tags, t],
    });
  }

  function removeTagFromNote(noteId: string, tag: string) {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    updateNote(noteId, {
      tags: note.tags.filter((t) => t !== tag),
    });
  }

  /* ---------- Wishlist CRUD ---------- */

  function addWishFromInput() {
    const text = wishInput.trim();
    if (!text) {
      setShowWishInput(false);
      return;
    }

    const item: WishlistItem = {
      id: createWishlistItemId(),
      text,
      completed: false,
      source: "user",
      createdAt: Date.now(),
    };

    commitWishlist([item, ...wishlist]);
    setWishInput("");
    setShowWishInput(false);
  }

  function generateWish() {
    const card = pickWishlistCard(cards);
    if (!card) {
      alert("还没有可用的愿望卡。");
      return;
    }

    const item: WishlistItem = {
      id: createWishlistItemId(),
      text: card.text,
      completed: false,
      source:
        card.character === "Levi" ? "levi" : "erwin",
      character: card.character,
      createdAt: Date.now(),
    };

    commitWishlist([item, ...wishlist]);
  }

  function toggleWish(id: string) {
    commitWishlist(
      wishlist.map((w) =>
        w.id === id ? { ...w, completed: !w.completed } : w
      )
    );
  }

  function deleteWish(id: string) {
    commitWishlist(wishlist.filter((w) => w.id !== id));
    if (editingWishId === id) setEditingWishId(null);
  }

  function updateWishText(id: string, text: string) {
    commitWishlist(
      wishlist.map((w) =>
        w.id === id ? { ...w, text } : w
      )
    );
  }

  /* ---------- 排序 & 过滤 ---------- */

  const sortedNotes = useMemo(() => {
    const list = [...notes].sort(
      (a, b) => b.updatedAt - a.updatedAt
    );

    if (!tagFilter) return list;

    return list.filter((n) =>
      n.tags.includes(tagFilter)
    );
  }, [notes, tagFilter]);

  const sortedWishlist = useMemo(() => {
    return [...wishlist].sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      return b.createdAt - a.createdAt;
    });
  }, [wishlist]);

  /* ---------- 编辑器视图 ---------- */

  const editingNote = editingNoteId
    ? notes.find((n) => n.id === editingNoteId)
    : null;

  if (editingNote) {
    return (
      <main className="app-screen notes-app">
        <header className="notes-editor-header">
          <button
            className="notes-editor-back"
            onClick={closeEditor}
            aria-label="返回"
          >
            <ChevronLeft size={26} strokeWidth={2.4} />
          </button>

          <div className="notes-editor-title-bar">
            Notes
          </div>

          <button
            className="notes-editor-delete"
            onClick={() => {
              if (window.confirm("删除这条笔记？")) {
                deleteNote(editingNote.id);
              }
            }}
            aria-label="删除"
          >
            <Trash2 size={18} strokeWidth={2} />
          </button>
        </header>

        <div className="notes-editor-body">
          <input
            className="notes-editor-title-input"
            value={editingNote.title}
            onChange={(e) =>
              updateNote(editingNote.id, {
                title: e.target.value,
              })
            }
            placeholder="Title"
            maxLength={80}
            autoFocus
          />

          <div className="notes-editor-tags">
            {editingNote.tags.map((t) => (
              <span
                key={t}
                className="notes-tag notes-tag-editable"
              >
                #{t}
                <button
                  className="notes-tag-remove"
                  onClick={() =>
                    removeTagFromNote(editingNote.id, t)
                  }
                  aria-label="移除标签"
                >
                  <X size={10} strokeWidth={3} />
                </button>
              </span>
            ))}

            <input
              className="notes-tag-input"
              value={tagDraft}
              onChange={(e) =>
                setTagDraft(e.target.value)
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" ||
                  e.key === " " ||
                  e.key === ","
                ) {
                  e.preventDefault();
                  addTagToNote(
                    editingNote.id,
                    tagDraft
                  );
                  setTagDraft("");
                }
                if (e.key === "Backspace" && !tagDraft) {
                  const last =
                    editingNote.tags[
                      editingNote.tags.length - 1
                    ];
                  if (last)
                    removeTagFromNote(
                      editingNote.id,
                      last
                    );
                }
              }}
              placeholder={
                editingNote.tags.length === 0
                  ? "添加标签…"
                  : ""
              }
              maxLength={16}
            />
          </div>

          <textarea
            className="notes-editor-content"
            value={editingNote.body}
            onChange={(e) =>
              updateNote(editingNote.id, {
                body: e.target.value,
              })
            }
            placeholder="Start writing…"
          />
        </div>
      </main>
    );
  }

  /* ---------- 列表视图 ---------- */

  return (
    <main className="app-screen notes-app">
      <header className="notes-header">
        <button
          className="notes-back"
          onClick={onBack}
          aria-label="返回"
        >
          <ChevronLeft size={26} strokeWidth={2.4} />
        </button>

        <div className="notes-header-center">
          <div className="notes-header-title">Notes</div>
          <div className="notes-header-sub">
            {notes.length} notes · {wishlist.length} wishes
          </div>
        </div>

        <button
          className="notes-icon-btn"
          onClick={() => setShowPoolEditor(true)}
          aria-label="卡池"
        >
          <Settings size={18} strokeWidth={2} />
        </button>

        <button
          className="notes-add-btn"
          onClick={createNote}
          aria-label="新建笔记"
        >
          <Plus size={20} strokeWidth={2.4} />
        </button>
      </header>

      <div className="notes-scroll">
        {/* ---------- WISHLIST ---------- */}
        <section className="notes-wish-section">
          <div className="notes-wish-header">
            <div className="notes-wish-label">
              WISHLIST
            </div>

            <div className="notes-wish-actions">
              <button
                className="notes-wish-action"
                onClick={() => {
                  setShowWishInput((v) => !v);
                  setWishInput("");
                }}
                aria-label="添加愿望"
              >
                <Plus size={16} strokeWidth={2.4} />
              </button>

              <button
                className="notes-wish-action"
                onClick={generateWish}
                aria-label="随机生成"
              >
                <Sparkles size={16} strokeWidth={2} />
              </button>
            </div>
          </div>

          {showWishInput && (
            <div className="notes-wish-input-row">
              <input
                type="text"
                value={wishInput}
                onChange={(e) =>
                  setWishInput(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addWishFromInput();
                  }
                  if (e.key === "Escape") {
                    setShowWishInput(false);
                    setWishInput("");
                  }
                }}
                placeholder="写下一个愿望…"
                maxLength={60}
                autoFocus
              />
              <button
                className="notes-wish-add"
                onClick={addWishFromInput}
              >
                添加
              </button>
            </div>
          )}

          {sortedWishlist.length === 0 ? (
            <div className="notes-wish-empty">
              还没有愿望。点 ＋ 写一个，或 ✦ 让他们说一个。
            </div>
          ) : (
            <ul className="notes-wish-list">
              {sortedWishlist.map((w) => {
                const isEditing = editingWishId === w.id;
                const fromCharacter =
                  w.character && w.source !== "user"
                    ? w.character
                    : null;

                const key = fromCharacter
                  ? toAvatarKey(fromCharacter)
                  : null;
                const avatarUrl = key
                  ? avatars[key]
                  : null;

                return (
                  <li
                    key={w.id}
                    className={`notes-wish-item${
                      w.completed ? " is-completed" : ""
                    }`}
                  >
                    <button
                      className="notes-wish-check"
                      onClick={() => toggleWish(w.id)}
                      aria-label={
                        w.completed
                          ? "取消完成"
                          : "标记完成"
                      }
                    >
                      {w.completed ? "✓" : "♡"}
                    </button>

                    {isEditing ? (
                      <input
                        className="notes-wish-edit-input"
                        value={w.text}
                        onChange={(e) =>
                          updateWishText(
                            w.id,
                            e.target.value
                          )
                        }
                        onBlur={() =>
                          setEditingWishId(null)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            setEditingWishId(null);
                          }
                        }}
                        maxLength={60}
                        autoFocus
                      />
                    ) : (
                      <button
                        className="notes-wish-text"
                        onClick={() =>
                          setEditingWishId(w.id)
                        }
                      >
                        {fromCharacter && (
                          <span
                            className={`notes-wish-source notes-wish-source-${fromCharacter.toLowerCase()}${
                              avatarUrl
                                ? " has-image"
                                : ""
                            }`}
                          >
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={fromCharacter}
                              />
                            ) : (
                              fromCharacter.charAt(0)
                            )}
                          </span>
                        )}
                        <span className="notes-wish-content">
                          {w.text}
                        </span>
                      </button>
                    )}

                    <button
                      className="notes-wish-delete"
                      onClick={() => deleteWish(w.id)}
                      aria-label="删除"
                    >
                      <X size={14} strokeWidth={2.4} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ---------- 标签筛选栏 ---------- */}
        {allTags.length > 0 && (
          <div className="notes-tag-bar">
            <button
              className={`notes-tag-filter${
                tagFilter === null ? " active" : ""
              }`}
              onClick={() => setTagFilter(null)}
            >
              All
            </button>

            {allTags.map((t) => (
              <button
                key={t}
                className={`notes-tag-filter${
                  tagFilter === t ? " active" : ""
                }`}
                onClick={() => setTagFilter(t)}
              >
                #{t}
              </button>
            ))}
          </div>
        )}

        {/* ---------- MY NOTES ---------- */}
        <section className="notes-list-section">
          <div className="notes-list-header">
            <span className="notes-list-label">
              {tagFilter
                ? `#${tagFilter}`
                : "MY NOTES"}
            </span>

            {tagFilter && (
              <button
                className="notes-list-clear-filter"
                onClick={() => setTagFilter(null)}
              >
                清除
              </button>
            )}
          </div>

          {sortedNotes.length === 0 ? (
            <div className="notes-list-empty">
              <div className="notes-list-empty-icon">
                <Sparkles size={34} strokeWidth={1.4} />
              </div>
              <div className="notes-list-empty-title">
                {tagFilter
                  ? "这个标签下还没有笔记"
                  : "还没有笔记"}
              </div>
              <div className="notes-list-empty-desc">
                点击右上角 ＋ 开始写第一条
              </div>
            </div>
          ) : (
            <ul className="notes-list">
              {sortedNotes.map((n) => {
                const tagPreview = getNoteTagPreview(n, 3);

                return (
                  <li
                    key={n.id}
                    className="notes-list-item"
                    onClick={() =>
                      setEditingNoteId(n.id)
                    }
                  >
                    <div className="notes-list-item-title">
                      {getNoteDisplayTitle(n)}
                    </div>

                    {tagPreview.length > 0 && (
                      <div className="notes-list-item-tags">
                        {tagPreview.map((t) => (
                          <span
                            key={t}
                            className="notes-tag notes-tag-small"
                          >
                            #{t}
                          </span>
                        ))}
                        {n.tags.length > 3 && (
                          <span className="notes-tag notes-tag-small notes-tag-more">
                            +{n.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="notes-list-item-meta">
                      <span>
                        {formatNoteTime(n.updatedAt)}
                      </span>
                      <span className="notes-list-item-dot">
                        ·
                      </span>
                      <span className="notes-list-item-preview">
                        {getNotePreview(n)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {showPoolEditor && (
        <WishlistPoolEditor
          cards={cards}
          onChange={commitCards}
          onClose={() => setShowPoolEditor(false)}
        />
      )}
    </main>
  );
}