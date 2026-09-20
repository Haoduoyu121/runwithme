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
  DIARY_MOODS,
  collectAllTags,
  createNoteId,
  createWishlistItemId,
  formatNoteTime,
  getDiaryPreview,
  getNoteDisplayTitle,
  getNotePreview,
  getNoteTagPreview,
  normalizeTag,
  type Note,
  type NoteAuthor,
  type WishlistCard,
  type WishlistItem,
  type WishlistCompleter,
} from "@/data/notes";

import {
  loadMoodCards,
  loadContentCards,
  saveMoodCards,
  saveContentCards,
} from "@/lib/diaryCardsStorage";
import { ensureDiaryScheduler } from "@/lib/diaryScheduler";
import {
  type DiaryMoodCard,
  type DiaryContentCard,
} from "@/data/diaryCards";
import {
  createHighlightId,
  type DiaryHighlight,
  type HighlightCard,
} from "@/data/diaryHighlights";
import {
  loadHighlights,
  loadHighlightCards,
  saveHighlights,
  saveHighlightCards,
} from "@/lib/diaryHighlightStorage";
import {
  createPendingWish,
  settlePendingWishes,
  runAutoJudge,
} from "@/lib/wishlistScheduler";
import { pushMemory } from "@/lib/memoryStorage";
import PoolCenter from "@/components/apps/notes/PoolCenter";
import DiaryEditorView from "@/components/apps/notes/DiaryEditorView";
import WishlistCompleteSheet from "@/components/apps/notes/WishlistCompleteSheet";

import { pickWishlistCard } from "@/data/wishlistCards";

import {
  loadNotes,
  loadWishlist,
  loadWishlistCards,
  saveNotes,
  saveWishlist,
  saveWishlistCards,
} from "@/lib/notesStorage";

import { useCollection } from "@/lib/CollectionContext";
import {
  useCharacterAvatars,
  toAvatarKey,
} from "@/lib/useCharacterAvatars";

type NotesAppProps = {
  onBack: () => void;
};

type ViewMode = "notes" | "diary";

export default function NotesApp({ onBack }: NotesAppProps) {
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

  const [mode, setMode] = useState<ViewMode>("notes");

  const [moodCards, setMoodCards] = useState<
    DiaryMoodCard[]
  >([]);
  const [contentCards, setContentCards] = useState<
    DiaryContentCard[]
  >([]);
  const [highlights, setHighlights] = useState<
    DiaryHighlight[]
  >([]);
  const [highlightCards, setHighlightCards] = useState<
    HighlightCard[]
  >([]);

  const [editingNoteId, setEditingNoteId] = useState<
    string | null
  >(null);

  const [showWishInput, setShowWishInput] = useState(false);
  const [wishInput, setWishInput] = useState("");
  const [editingWishId, setEditingWishId] = useState<
    string | null
  >(null);
  const [completingWish, setCompletingWish] =
    useState<WishlistItem | null>(null);

  const [showPoolEditor, setShowPoolEditor] =
    useState(false);

  const [tagFilter, setTagFilter] = useState<string | null>(
    null
  );
  const [tagDraft, setTagDraft] = useState("");

  // tick 用于 pending 倒计时刷新
  const [tick, setTick] = useState(0);

  /* ---------- 初始化 ---------- */

  useEffect(() => {
    const initialNotes = loadNotes();
    const initialWishlist = loadWishlist();
    const initialCards = loadWishlistCards();
    const initialMood = loadMoodCards();
    const initialContent = loadContentCards();
    const initialHighlights = loadHighlights();
    const initialHlCards = loadHighlightCards();

    const result = ensureDiaryScheduler(initialNotes);

    if (result.notes.length > 0) {
      const next = [...result.notes, ...initialNotes];
      saveNotes(next);
      setNotes(next);
    } else {
      setNotes(initialNotes);
    }

    if (result.highlights.length > 0) {
      const merged = [
        ...result.highlights,
        ...initialHighlights,
      ];
      saveHighlights(merged);
      setHighlights(merged);
    } else {
      setHighlights(initialHighlights);
    }

    // Wishlist：先结算 pending，再跑 16-24h 判定
    let w = settlePendingWishes(
      initialWishlist,
      initialCards
    );

    const judgeResult = runAutoJudge(
      w,
      initialCards,
      initialHlCards
    );
    w = judgeResult.wishlist;

    if (w !== initialWishlist) {
      saveWishlist(w);
    }
    setWishlist(w);

    // 自动勾选进 Memory
    judgeResult.autoCompleted.forEach((item) => {
      try {
        pushMemory({
          sourceApp: "wishlist",
          sourceId: item.id,
          timestamp: item.completedAt || Date.now(),
          type: "milestone",
          title: item.text,
          preview: item.completionNote || "",
          meta: {
            completedBy: (item.completedBy || [])
              .map((x) => (x === "user" ? "我" : x))
              .join(" · "),
            character: item.character,
            source: item.source,
            auto: true,
          },
        });
      } catch (e) {
        console.error(
          "[wishlist] 自动完成 Memory 联动失败",
          e
        );
      }
    });

    setCards(initialCards);
    setMoodCards(initialMood);
    setContentCards(initialContent);
    setHighlightCards(initialHlCards);
  }, []);

  // pending 每秒 tick
  useEffect(() => {
    const hasPending = wishlist.some(
      (w) =>
        typeof w.pendingUntil === "number" && !w.text
    );
    if (!hasPending) return;

    const timer = window.setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [wishlist]);

  // pending 到点 → 结算
  useEffect(() => {
    if (wishlist.length === 0) return;
    const settled = settlePendingWishes(wishlist, cards);
    if (settled !== wishlist) {
      setWishlist(settled);
      saveWishlist(settled);
    }
  }, [tick, wishlist, cards]);

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

  function commitMoodCards(next: DiaryMoodCard[]) {
    setMoodCards(next);
    saveMoodCards(next);
  }

  function commitContentCards(next: DiaryContentCard[]) {
    setContentCards(next);
    saveContentCards(next);
  }

  function commitHighlights(next: DiaryHighlight[]) {
    setHighlights(next);
    saveHighlights(next);
  }

  function commitHighlightCards(next: HighlightCard[]) {
    setHighlightCards(next);
    saveHighlightCards(next);
  }

  /* ---------- Notes CRUD ---------- */

  function createNote() {
    const isDiary = mode === "diary";
    const note: Note = {
      id: createNoteId(),
      kind: isDiary ? "diary" : "note",
      author: "user",
      title: "",
      body: "",
      tags:
        !isDiary && tagFilter ? [tagFilter] : [],
      mood: undefined,
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
          kind: updated.kind,
          author: updated.author,
          tagCount: updated.tags.length,
        },
      });
    }
  }

  function deleteNote(id: string) {
    commitNotes(notes.filter((n) => n.id !== id));
    commitHighlights(
      highlights.filter((h) => h.noteId !== id)
    );
    if (editingNoteId === id) setEditingNoteId(null);
  }

  function closeEditor() {
    const note = notes.find((n) => n.id === editingNoteId);
    if (note) {
      const isEmpty =
        note.kind === "diary"
          ? !note.body.trim() && !note.mood
          : !note.title.trim() &&
            !note.body.trim() &&
            note.tags.length === 0;
      if (isEmpty) {
        commitNotes(
          notes.filter((n) => n.id !== editingNoteId)
        );
      }
    }
    setEditingNoteId(null);
  }

  /* ---------- 标签 ---------- */

  const allTags = useMemo(
    () =>
      collectAllTags(
        notes.filter((n) => n.kind !== "diary")
      ),
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
    const hasPending = wishlist.some(
      (w) =>
        typeof w.pendingUntil === "number" && !w.text
    );
    if (hasPending) {
      window.alert("还在酝酿中，稍等。");
      return;
    }

    const pending = createPendingWish();
    commitWishlist([pending, ...wishlist]);
  }

  function requestToggleWish(w: WishlistItem) {
    if (w.completed) {
      // 取消完成
      commitWishlist(
        wishlist.map((it) =>
          it.id === w.id
            ? {
                ...it,
                completed: false,
                completedBy: undefined,
                completedAt: undefined,
                completionNote: undefined,
              }
            : it
        )
      );
      return;
    }

    // 打开完成 sheet
    setCompletingWish(w);
  }

  function confirmComplete(
    completedBy: WishlistCompleter[],
    note: string
  ) {
    if (!completingWish) return;
    const now = Date.now();

    const next = wishlist.map((it) =>
      it.id === completingWish.id
        ? {
            ...it,
            completed: true,
            completedBy,
            completedAt: now,
            completionNote: note || undefined,
            inMemory: true,
          }
        : it
    );
    commitWishlist(next);

    // 进 Memory
    try {
      pushMemory({
        sourceApp: "wishlist",
        sourceId: completingWish.id,
        timestamp: now,
        type: "milestone",
        title: completingWish.text,
        preview: note || "",
        meta: {
          completedBy: completedBy
            .map((x) => (x === "user" ? "我" : x))
            .join(" · "),
          character: completingWish.character,
          source: completingWish.source,
        },
      });
    } catch (e) {
      console.error("[wishlist] Memory 联动失败", e);
    }

    setCompletingWish(null);
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
    const list = notes
      .filter((n) => n.kind !== "diary")
      .sort((a, b) => b.updatedAt - a.updatedAt);

    if (!tagFilter) return list;

    return list.filter((n) =>
      n.tags.includes(tagFilter)
    );
  }, [notes, tagFilter]);

  const sortedDiaries = useMemo(() => {
    return notes
      .filter((n) => n.kind === "diary")
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes]);

  const sortedWishlist = useMemo(() => {
    return [...wishlist].sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      return b.createdAt - a.createdAt;
    });
  }, [wishlist]);

  /* ---------- 心情 chips ---------- */

  function getMoodOptionsFor(): string[] {
    const set = new Set<string>();
    moodCards.forEach((c) => {
      if (c.enabled) set.add(c.mood);
    });

    if (set.size === 0) {
      DIARY_MOODS.forEach((m) => set.add(m));
    }

    return Array.from(set);
  }

  /* ---------- 编辑器视图 ---------- */

  const editingNote = editingNoteId
    ? notes.find((n) => n.id === editingNoteId)
    : null;

  if (editingNote && editingNote.kind === "diary") {
    return (
      <DiaryEditorView
        note={editingNote}
        highlights={highlights.filter(
          (h) => h.noteId === editingNote.id
        )}
        avatars={avatars}
        moodOptions={getMoodOptionsFor()}
        onUpdateNote={updateNote}
        onCreateHighlight={(payload) => {
          const h: DiaryHighlight = {
            id: createHighlightId(),
            noteId: editingNote.id,
            author: "user",
            text: payload.text,
            occurrence: payload.occurrence,
            note: payload.note,
            createdAt: Date.now(),
          };
          commitHighlights([...highlights, h]);
        }}
        onUpdateHighlight={(id, patch) => {
          commitHighlights(
            highlights.map((h) =>
              h.id === id ? { ...h, ...patch } : h
            )
          );
        }}
        onDeleteHighlight={(id) => {
          commitHighlights(
            highlights.filter((h) => h.id !== id)
          );
        }}
        onDeleteNote={deleteNote}
        onClose={closeEditor}
      />
    );
  }

  /* ---------- 笔记编辑器 ---------- */

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
            {sortedNotes.length} notes ·{" "}
            {sortedDiaries.length} diaries ·{" "}
            {wishlist.length} wishes
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
          aria-label="新建"
        >
          <Plus size={20} strokeWidth={2.4} />
        </button>
      </header>

      <div className="notes-scroll">
        <div className="notes-tabs">
          <button
            className={`notes-tab${
              mode === "notes" ? " active" : ""
            }`}
            onClick={() => setMode("notes")}
          >
            笔记
          </button>
          <button
            className={`notes-tab${
              mode === "diary" ? " active" : ""
            }`}
            onClick={() => setMode("diary")}
          >
            日记
          </button>
        </div>

        {mode === "notes" ? (
          <>
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
                    const isPending =
                      typeof w.pendingUntil ===
                        "number" && !w.text;

                    if (isPending) {
                      const remain = Math.max(
                        0,
                        Math.ceil(
                          (w.pendingUntil! -
                            Date.now()) /
                            1000
                        )
                      );
                      return (
                        <li
                          key={w.id}
                          className="notes-wish-item notes-wish-pending"
                        >
                          <span className="notes-wish-pending-spark">
                            <Sparkles
                              size={14}
                              strokeWidth={2}
                            />
                          </span>
                          <span className="notes-wish-pending-text">
                            正在酝酿…
                          </span>
                          <span className="notes-wish-pending-count">
                            {remain}s
                          </span>
                          <button
                            className="notes-wish-delete"
                            onClick={() => deleteWish(w.id)}
                            aria-label="取消"
                          >
                            <X size={14} strokeWidth={2.4} />
                          </button>
                        </li>
                      );
                    }

                    const isEditing =
                      editingWishId === w.id;
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

                    const completedByArr =
                      w.completedBy ?? [];
                    const completedLabel =
                      completedByArr
                        .map((x) =>
                          x === "user" ? "我" : x
                        )
                        .join(" · ");

                    return (
                      <li
                        key={w.id}
                        className={`notes-wish-item${
                          w.completed
                            ? " is-completed"
                            : ""
                        }`}
                      >
                        <button
                          className="notes-wish-check"
                          onClick={() =>
                            requestToggleWish(w)
                          }
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
                              {w.completed &&
                                completedByArr.length >
                                  0 && (
                                  <span className="notes-wish-completed-by">
                                    {" "}
                                    · {completedLabel} 完成
                                  </span>
                                )}
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

                        {w.completed &&
                          w.completionNote && (
                            <div className="notes-wish-note">
                              「{w.completionNote}」
                            </div>
                          )}
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
                    <Sparkles
                      size={34}
                      strokeWidth={1.4}
                    />
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
                    const tagPreview =
                      getNoteTagPreview(n, 3);

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
          </>
        ) : (
          /* ---------- DIARY ---------- */
          <section className="notes-list-section">
            <div className="notes-list-header">
              <span className="notes-list-label">DIARY</span>
            </div>

            {sortedDiaries.length === 0 ? (
              <div className="notes-list-empty">
                <div className="notes-list-empty-icon">
                  <Sparkles size={34} strokeWidth={1.4} />
                </div>
                <div className="notes-list-empty-title">
                  还没有日记
                </div>
                <div className="notes-list-empty-desc">
                  点击右上角 ＋ 写下第一篇
                </div>
              </div>
            ) : (
              <ul className="notes-diary-list">
                {sortedDiaries.map((d) => {
                  const hlCount = highlights.filter(
                    (h) => h.noteId === d.id
                  ).length;
                  return (
                    <li
                      key={d.id}
                      className="notes-diary-item"
                      onClick={() =>
                        setEditingNoteId(d.id)
                      }
                    >
                      <div className="notes-diary-item-head">
                        <DiaryAvatarInline
                          author={d.author}
                          avatars={avatars}
                        />
                        <span className="notes-diary-author-name">
                          {d.author === "user"
                            ? "我"
                            : d.author}
                        </span>
                        {d.mood && (
                          <span className="notes-diary-mood-tag">
                            {d.mood}
                          </span>
                        )}
                        {hlCount > 0 && (
                          <span className="notes-diary-hl-badge">
                            {hlCount} 条划线
                          </span>
                        )}
                        <span className="notes-diary-time">
                          {formatNoteTime(d.updatedAt)}
                        </span>
                      </div>
                      <div className="notes-diary-item-preview">
                        {getDiaryPreview(d, 90)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>

      {showPoolEditor && (
        <PoolCenter
          cards={cards}
          onCardsChange={commitCards}
          moodCards={moodCards}
          onMoodCardsChange={commitMoodCards}
          contentCards={contentCards}
          onContentCardsChange={commitContentCards}
          highlightCards={highlightCards}
          onHighlightCardsChange={commitHighlightCards}
          onClose={() => setShowPoolEditor(false)}
        />
      )}

      {completingWish && (
        <WishlistCompleteSheet
          item={completingWish}
          cards={highlightCards}
          avatars={avatars}
          onConfirm={confirmComplete}
          onCancel={() => setCompletingWish(null)}
        />
      )}
    </main>
  );
}

/* ---------- 日记列表头像 ---------- */

function DiaryAvatarInline({
  author,
  avatars,
}: {
  author: NoteAuthor;
  avatars: Record<string, string | null>;
}) {
  if (author === "user") {
    const url = avatars.you ?? null;
    return (
      <span
        className={`notes-diary-avatar is-user${
          url ? " has-image" : ""
        }`}
      >
        {url ? <img src={url} alt="我" /> : "我"}
      </span>
    );
  }
  const key = toAvatarKey(author);
  const url = key ? avatars[key] : null;
  return (
    <span className="notes-diary-avatar">
      {url ? (
        <img src={url} alt={author} />
      ) : (
        author.charAt(0)
      )}
    </span>
  );
}