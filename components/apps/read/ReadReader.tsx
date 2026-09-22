"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  Bookmark,
  ChevronLeft,
  List,
  Plus,
  Settings,
  Users,
  X,
} from "lucide-react";

import type {
  ReadBackgroundId,
  ReadBook,
  ReadSettings,
} from "@/data/read";
import {
  loadReadSettings,
  saveReadSettings,
  upsertBook,
} from "@/lib/readLibraryStorage";
import { getBookText } from "@/lib/readBookFiles";
import { getChapters } from "@/lib/readChapterCache";
import { getChapterText } from "@/lib/readChapterParser";
import {
  addHighlight,
  createHighlightId,
  loadHighlights,
  removeHighlight,
  updateHighlight,
  type Highlight,
} from "@/lib/readHighlights";
import {
  paginateChapter,
  type PageRange,
} from "@/lib/readPaginator";

import {
  HighlightActionMenu,
  HighlightDetail,
  HighlightNoteEditor,
} from "./HighlightOverlays";
import HighlightsDrawer from "./HighlightsDrawer";
import ReadInviteSheet from "./ReadInviteSheet";
import { useCharacterAvatars } from "@/lib/useCharacterAvatars";
import {
  loadPendingReadInvite,
  clearPendingReadInvite,
} from "@/lib/readInviteStorage";

import { useCollection } from "@/lib/CollectionContext";
import { useSystem } from "@/lib/SystemContext";
import ReadChatPanel from "./ReadChatPanel";

import {
  type ReadingPartner,
  type ReadingSession,
} from "@/lib/readReadingSession";

import {
  loadChapterLimit,
  saveChapterLimit,
  maybeTriggerPageHighlight,
  maybeTriggerAutoHighlight,
  shouldCollectHighlight,
} from "@/lib/readRandomHighlight";

type ReadReaderProps = {
  book: ReadBook;
  onExit: () => void;
};

const BACKGROUNDS: {
  id: ReadBackgroundId;
  label: string;
}[] = [
  { id: "paper", label: "纸张" },
  { id: "cream", label: "米白" },
  { id: "grey", label: "浅灰" },
  { id: "night", label: "夜间" },
];

const FLIP_DURATION = 300;

export default function ReadReader({
  book,
  onExit,
}: ReadReaderProps) {
  const [text, setText] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [chapterIndex, setChapterIndex] = useState(
    book.progress.chapterIndex
  );
  const [pageIndex, setPageIndex] = useState(
    book.progress.pageIndex ?? 0
  );
  const [pages, setPages] = useState<PageRange[]>([]);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [showToc, setShowToc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHighlights, setShowHighlights] =
    useState(false);
  const [showChat, setShowChat] = useState(false);
  const [settings, setSettings] = useState<ReadSettings>(
    loadReadSettings()
  );

  const [highlights, setHighlights] = useState<
    Highlight[]
  >([]);

  const { add: addToCollection } = useCollection();
  const { settings: systemSettings } = useSystem();

  const [session, setSession] = useState<ReadingSession | null>(
    null
  );
  const [showInvite, setShowInvite] = useState(false);
  const [chapterLimit, setChapterLimit] = useState(3);
  const [toast, setToast] = useState<string | null>(null);
  const avatars = useCharacterAvatars();

  const [selection, setSelection] = useState<{
    rect: DOMRect;
    chapterIndex: number;
    startOffset: number;
    endOffset: number;
    text: string;
  } | null>(null);

  const [editingNote, setEditingNote] = useState<{
    highlightId: string | null;
    quote: string;
    initial: string;
  } | null>(null);

  const [activeHighlightId, setActiveHighlightId] =
    useState<string | null>(null);

  /* ★ 用 callback ref + state 追踪舞台 DOM，解决 loading 分支导致 ref 为空的问题 */
  const [stageEl, setStageEl] = useState<HTMLDivElement | null>(
    null
  );

  const [flip, setFlip] = useState<{
    dir: "next" | "prev";
    from: number;
    angle: number;
  } | null>(null);

  const activeBodyRef = useRef<HTMLDivElement | null>(null);
  const flipAnimRef = useRef<number | null>(null);
  const flipRef = useRef(flip);
  flipRef.current = flip;

  const pageIndexRef = useRef(pageIndex);
  useEffect(() => {
    pageIndexRef.current = pageIndex;
  }, [pageIndex]);

  const pagesRef = useRef<PageRange[]>([]);
  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  const chapterIndexRef = useRef(chapterIndex);
  useEffect(() => {
    chapterIndexRef.current = chapterIndex;
  }, [chapterIndex]);

  useEffect(() => {
    setChapterLimit(loadChapterLimit());
  }, []);

  /* ---------- 加载正文 ---------- */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t = await getBookText(book.id);
        if (cancelled) return;
        if (!t) {
          setLoadErr(
            "找不到这本书的正文，可能已被清理。"
          );
          return;
        }
        setText(t);
      } catch (e) {
        console.error("[Read] 读取正文失败:", e);
        if (!cancelled) setLoadErr("读取正文失败。");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [book.id]);

  useEffect(() => {
    setHighlights(loadHighlights(book.id));
  }, [book.id]);

  const chapters = useMemo(() => {
    if (!text) return [];
    return getChapters(book.id, text);
  }, [text, book.id]);

  const currentChapter = chapters[chapterIndex] ?? null;

  const chapterText = useMemo(() => {
    if (!text || !currentChapter) return "";
    return getChapterText(text, currentChapter);
  }, [text, currentChapter]);

  const chapterHighlights = useMemo(() => {
    return highlights.filter(
      (h) => h.chapterIndex === chapterIndex
    );
  }, [highlights, chapterIndex]);

  /* ---------- 分页（依赖 stageEl，元素到位后才跑） ---------- */

  useEffect(() => {
    if (!stageEl) return;
    if (!chapterText) {
      setPages([]);
      return;
    }

    let raf = 0;
    const run = () => {
      const w = stageEl.clientWidth;
      const h = stageEl.clientHeight;
      if (w <= 0 || h <= 0) {
        raf = requestAnimationFrame(run);
        return;
      }
      const fontFamily =
        settings.fontFamily === "serif"
          ? '"Songti SC", "Noto Serif SC", Georgia, serif'
          : '-apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", Arial, sans-serif';
      const ranges = paginateChapter({
        text: chapterText,
        width: w,
        height: h,
        fontSize: settings.fontSize,
        lineHeight: settings.lineHeight,
        fontFamily,
        title: currentChapter?.title ?? "",
      });
      setPages(ranges);
      setPageIndex((prev) =>
        Math.max(0, Math.min(ranges.length - 1, prev))
      );
    };
    raf = requestAnimationFrame(run);

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(run);
    });
    ro.observe(stageEl);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    stageEl,
    chapterText,
    settings.fontSize,
    settings.lineHeight,
    settings.fontFamily,
    currentChapter?.title,
  ]);

  const pageCount = pages.length;

  /* ---------- 一起读 ---------- */

  const lastPageKeyRef = useRef<string>("");
  useEffect(() => {
    if (!session) return;
    if (!chapterText) return;

    const key = `${book.id}:${chapterIndex}:${pageIndex}`;
    if (lastPageKeyRef.current === key) return;
    lastPageKeyRef.current = key;

    const h = maybeTriggerPageHighlight({
      bookId: book.id,
      chapterIndex,
      chapterText,
      partners: session.partners,
      chapterLimit,
    });
    if (!h) return;

    const next = addHighlight(h);
    setHighlights(next);

    if (shouldCollectHighlight()) {
      try {
        addToCollection({
          owner: h.author === "levi" ? "levi" : "erwin",
          source: "read",
          sourceId: h.id,
          content: h.text,
          sender: h.author === "levi" ? "Levi" : "Erwin",
          originalAt: h.createdAt,
          meta: {
            bookId: book.id,
            bookTitle: book.title,
            chapterIndex: h.chapterIndex,
          },
        });
      } catch (e) {
        console.warn(
          "[Read] 收藏到 Collection 失败:",
          e
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterIndex, pageIndex, session, chapterText]);

  const autoCheckBookRef = useRef<string>("");
  useEffect(() => {
    if (!text || !currentChapter) return;
    if (autoCheckBookRef.current === book.id) return;
    autoCheckBookRef.current = book.id;

    const autoHighlights = maybeTriggerAutoHighlight({
      bookId: book.id,
      chapterIndex,
      chapterText,
    });
    if (autoHighlights.length === 0) return;

    let latest: Highlight[] = [];
    for (const h of autoHighlights) {
      latest = addHighlight(h);
    }
    if (latest.length > 0) {
      setHighlights(latest);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, currentChapter, book.id]);

  const pendingCheckedRef = useRef<string>("");
  useEffect(() => {
    if (!text || !currentChapter) return;
    if (session) return;
    if (pendingCheckedRef.current === book.id) return;

    const pending = loadPendingReadInvite();
    if (!pending) return;
    pendingCheckedRef.current = book.id;
    clearPendingReadInvite();

    setSession({
      bookId: book.id,
      invited: pending.from,
      partners: pending.from,
      startedAt: Date.now(),
    });

    const names = pending.from
      .map((p) => (p === "levi" ? "Levi" : "Erwin"))
      .join(" & ");
    setToast(`${names} 来了一起读`);
    window.setTimeout(() => setToast(null), 2600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, currentChapter, session, book.id]);

  const prevChapterRef = useRef(chapterIndex);
  useEffect(() => {
    if (prevChapterRef.current === chapterIndex) return;
    prevChapterRef.current = chapterIndex;
    setPageIndex(0);
    pageIndexRef.current = 0;
  }, [chapterIndex]);

  const savedOnceRef = useRef(false);
  useEffect(() => {
    if (!savedOnceRef.current) {
      savedOnceRef.current = true;
      return;
    }
    upsertBook({
      ...book,
      progress: {
        chapterIndex,
        offset: 0,
        pageIndex,
        updatedAt: Date.now(),
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterIndex, pageIndex]);

  useEffect(() => {
    return () => {
      upsertBook({
        ...book,
        progress: {
          chapterIndex: chapterIndexRef.current,
          offset: 0,
          pageIndex: pageIndexRef.current,
          updatedAt: Date.now(),
        },
      });
      if (flipAnimRef.current !== null) {
        cancelAnimationFrame(flipAnimRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- 翻页 ---------- */

  function cancelFlipAnim() {
    if (flipAnimRef.current !== null) {
      cancelAnimationFrame(flipAnimRef.current);
      flipAnimRef.current = null;
    }
  }

  function animateFlipTo(target: number, onDone: () => void) {
    cancelFlipAnim();
    const start = flipRef.current?.angle ?? 0;
    const t0 = performance.now();
    function step(now: number) {
      const p = Math.min(1, (now - t0) / FLIP_DURATION);
      const eased = 1 - Math.pow(1 - p, 3);
      const a = start + (target - start) * eased;
      setFlip((prev) => (prev ? { ...prev, angle: a } : null));
      if (p < 1) {
        flipAnimRef.current = requestAnimationFrame(step);
      } else {
        flipAnimRef.current = null;
        onDone();
      }
    }
    flipAnimRef.current = requestAnimationFrame(step);
  }

  function goNextPage() {
    if (flipRef.current) return;
    const idx = pageIndexRef.current;
    const list = pagesRef.current;
    if (idx >= list.length - 1) {
      if (chapterIndex < chapters.length - 1) {
        setChapterIndex(chapterIndex + 1);
      }
      return;
    }
    setFlip({ dir: "next", from: idx, angle: 0 });
    animateFlipTo(-180, () => {
      setPageIndex(idx + 1);
      pageIndexRef.current = idx + 1;
      setFlip(null);
    });
  }

  function goPrevPage() {
    if (flipRef.current) return;
    const idx = pageIndexRef.current;
    if (idx <= 0) {
      if (chapterIndex > 0) {
        setChapterIndex(chapterIndex - 1);
      }
      return;
    }
    setFlip({ dir: "prev", from: idx - 1, angle: -180 });
    animateFlipTo(0, () => {
      setPageIndex(idx - 1);
      pageIndexRef.current = idx - 1;
      setFlip(null);
    });
  }

  function springBack() {
    const f = flipRef.current;
    if (!f) return;
    const target = f.dir === "next" ? 0 : -180;
    animateFlipTo(target, () => {
      setFlip(null);
    });
  }

  /* ---------- 手势 ---------- */

  const touchRef = useRef<{
    x: number;
    y: number;
    t: number;
    locked: "h" | "v" | null;
    moved: boolean;
    dir: "next" | "prev" | null;
  } | null>(null);

  const goPrevRef = useRef(goPrevPage);
  const goNextRef = useRef(goNextPage);
  const springBackRef = useRef(springBack);
  goPrevRef.current = goPrevPage;
  goNextRef.current = goNextPage;
  springBackRef.current = springBack;

  useEffect(() => {
    if (!stageEl) return;
    const stage = stageEl;
    const W = () => stage.clientWidth || 1;

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) {
        touchRef.current = null;
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target && target.closest("mark[data-hl-id]")) {
        touchRef.current = null;
        return;
      }
      if (flipRef.current) {
        touchRef.current = null;
        return;
      }
      cancelFlipAnim();
      const t = e.touches[0];
      touchRef.current = {
        x: t.clientX,
        y: t.clientY,
        t: Date.now(),
        locked: null,
        moved: false,
        dir: null,
      };
    }

    function onTouchMove(e: TouchEvent) {
      const st = touchRef.current;
      if (!st) return;
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - st.x;
      const dy = t.clientY - st.y;

      if (st.locked === null) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        st.locked = Math.abs(dx) >= Math.abs(dy) ? "h" : "v";
      }
      if (st.locked === "v") return;

      st.moved = true;
      if (!st.dir) {
        const idx = pageIndexRef.current;
        const list = pagesRef.current;
        if (dx < 0) {
          if (
            idx >= list.length - 1 &&
            chapterIndexRef.current >= chapters.length - 1
          )
            return;
          st.dir = "next";
        } else {
          if (
            idx <= 0 &&
            chapterIndexRef.current <= 0
          )
            return;
          st.dir = "prev";
        }
      }
      const w = W();
      if (st.dir === "next") {
        const progress = Math.max(0, Math.min(1, -dx / w));
        const angle = -progress * 180;
        setFlip((prev) => {
          if (prev && prev.dir === "next") {
            return { ...prev, angle };
          }
          return {
            dir: "next",
            from: pageIndexRef.current,
            angle,
          };
        });
      } else {
        const progress = Math.max(0, Math.min(1, dx / w));
        const angle = -180 + progress * 180;
        setFlip((prev) => {
          if (prev && prev.dir === "prev") {
            return { ...prev, angle };
          }
          return {
            dir: "prev",
            from: pageIndexRef.current - 1,
            angle,
          };
        });
      }
    }

    function onTouchEnd(e: TouchEvent) {
      const st = touchRef.current;
      touchRef.current = null;
      if (!st) return;

      const t = e.changedTouches[0];
      const dx = t.clientX - st.x;
      const dy = t.clientY - st.y;
      const dt = Math.max(1, Date.now() - st.t);

      if (
        !st.moved &&
        Math.abs(dx) < 10 &&
        Math.abs(dy) < 10 &&
        dt < 300
      ) {
        const w2 = window.innerWidth;
        const x = t.clientX;
        if (x < 40) return;
        if (x < w2 * 0.28) {
          goPrevRef.current();
        } else if (x > w2 * 0.72) {
          goNextRef.current();
        } else {
          setChromeVisible((v) => !v);
        }
        return;
      }

      if (st.moved && st.dir) {
        const f = flipRef.current;
        if (!f) return;
        const progress =
          f.dir === "next"
            ? -f.angle / 180
            : (f.angle + 180) / 180;
        const v = Math.abs(dx) / dt;
        const shouldFlip = progress > 0.3 || v > 0.5;
        if (shouldFlip) {
          const target = f.dir === "next" ? -180 : 0;
          const fromPage = f.from;
          animateFlipTo(target, () => {
            const nextIdx =
              f.dir === "next" ? fromPage + 1 : fromPage;
            setPageIndex(nextIdx);
            pageIndexRef.current = nextIdx;
            setFlip(null);
          });
        } else {
          springBackRef.current();
        }
      }
    }

    stage.addEventListener("touchstart", onTouchStart, {
      passive: true,
    });
    stage.addEventListener("touchmove", onTouchMove, {
      passive: true,
    });
    stage.addEventListener("touchend", onTouchEnd, {
      passive: true,
    });
    stage.addEventListener("touchcancel", onTouchEnd, {
      passive: true,
    });

    return () => {
      stage.removeEventListener("touchstart", onTouchStart);
      stage.removeEventListener("touchmove", onTouchMove);
      stage.removeEventListener("touchend", onTouchEnd);
      stage.removeEventListener("touchcancel", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageEl, chapters.length]);

  /* ---------- 选区检测 ---------- */

  function checkSelection() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setSelection(null);
      return;
    }
    const body = activeBodyRef.current;
    if (!body) return;
    const range = sel.getRangeAt(0);
    if (!body.contains(range.commonAncestorContainer)) {
      setSelection(null);
      return;
    }
    const cur = pages[pageIndex];
    if (!cur) return;
    const pageStart = cur.start;
    const localStart = textOffsetIn(
      body,
      range.startContainer,
      range.startOffset
    );
    const localEnd = textOffsetIn(
      body,
      range.endContainer,
      range.endOffset
    );
    if (localStart < 0 || localEnd <= localStart) {
      setSelection(null);
      return;
    }
    const startOffset = pageStart + localStart;
    const endOffset = pageStart + localEnd;
    const selectedText = chapterText.slice(
      startOffset,
      endOffset
    );
    if (!selectedText.trim()) {
      setSelection(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    setSelection({
      rect,
      chapterIndex,
      startOffset,
      endOffset,
      text: selectedText,
    });
  }

  function closeSelectionMenu() {
    setSelection(null);
    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();
  }

  function handleCreateHighlight() {
    if (!selection) return;
    const h: Highlight = {
      id: createHighlightId(),
      bookId: book.id,
      chapterIndex: selection.chapterIndex,
      startOffset: selection.startOffset,
      endOffset: selection.endOffset,
      text: selection.text,
      kind: "highlight",
      author: "user",
      createdAt: Date.now(),
    };
    const next = addHighlight(h);
    setHighlights(next);
    closeSelectionMenu();
  }

  function handleCreateNote() {
    if (!selection) return;
    const h: Highlight = {
      id: createHighlightId(),
      bookId: book.id,
      chapterIndex: selection.chapterIndex,
      startOffset: selection.startOffset,
      endOffset: selection.endOffset,
      text: selection.text,
      kind: "note",
      author: "user",
      createdAt: Date.now(),
    };
    const next = addHighlight(h);
    setHighlights(next);
    setEditingNote({
      highlightId: h.id,
      quote: h.text,
      initial: "",
    });
    closeSelectionMenu();
  }

  function handleSaveNote(text: string) {
    if (!editingNote) return;
    const trimmed = text.trim();
    if (!trimmed) {
      if (editingNote.highlightId) {
        setHighlights(
          removeHighlight(book.id, editingNote.highlightId)
        );
      }
      setEditingNote(null);
      return;
    }
    if (editingNote.highlightId) {
      setHighlights(
        updateHighlight(book.id, editingNote.highlightId, {
          note: trimmed,
          kind: "note",
        })
      );
    }
    setEditingNote(null);
  }

  function handleDeleteHighlight(id: string) {
    setHighlights(removeHighlight(book.id, id));
    setActiveHighlightId(null);
  }

  function handleMarkClick(id: string) {
    setActiveHighlightId(id);
  }

  function handleJumpToHighlight(
    ci: number,
    _startOffset: number
  ) {
    setChapterIndex(ci);
    setPageIndex(0);
  }

  function updateSettings(next: Partial<ReadSettings>) {
    const merged = { ...settings, ...next };
    setSettings(merged);
    saveReadSettings(merged);
  }

  function jumpToChapter(i: number) {
    setShowToc(false);
    setChapterIndex(i);
  }

  function handleInvite(accepted: ReadingPartner[]) {
    if (accepted.length === 0) {
      setToast("他们都没空，下次再试吧。");
      setShowInvite(false);
      window.setTimeout(() => setToast(null), 2600);
      return;
    }
    setSession({
      bookId: book.id,
      invited: accepted,
      partners: accepted,
      startedAt: Date.now(),
    });
    setShowInvite(false);
    const names = accepted
      .map((p) => (p === "levi" ? "Levi" : "Erwin"))
      .join(" & ");
    setToast(`${names} 来了一起读`);
    window.setTimeout(() => setToast(null), 2600);
  }

  function handleEndSession() {
    setSession(null);
    setShowChat(false);
  }

  /* ---------- 页内容渲染 ---------- */

  function renderPage(
    pageIdx: number,
    isActivePage: boolean
  ): ReactNode {
    const range = pages[pageIdx];
    if (!range) return null;
    const slice = chapterText.slice(range.start, range.end);
    const isFirst = pageIdx === 0;
    const isLast = pageIdx === pages.length - 1;

    const inPage = chapterHighlights
      .filter(
        (h) =>
          h.endOffset > range.start &&
          h.startOffset < range.end
      )
      .map((h) => ({
        ...h,
        startOffset: Math.max(0, h.startOffset - range.start),
        endOffset: Math.min(slice.length, h.endOffset - range.start),
      }))
      .sort((a, b) => a.startOffset - b.startOffset);

    const nodes: ReactNode[] = [];
    let cursor = 0;
    let key = 0;
    for (const h of inPage) {
      const s = Math.max(cursor, h.startOffset);
      const e = Math.min(slice.length, h.endOffset);
      if (e <= s) continue;
      if (s > cursor) nodes.push(slice.slice(cursor, s));
      nodes.push(
        <mark
          key={`hl-${h.id}-${key++}`}
          className={
            h.kind === "note" ? "read-hl read-hl-note" : "read-hl"
          }
          data-hl-id={h.id}
          data-hl-author={h.author}
          onClick={(ev) => {
            ev.stopPropagation();
            handleMarkClick(h.id);
          }}
        >
          {slice.slice(s, e)}
        </mark>
      );
      cursor = e;
    }
    if (cursor < slice.length) nodes.push(slice.slice(cursor));

    const bodyStyle: React.CSSProperties = {
      fontSize: `${settings.fontSize}px`,
      lineHeight: settings.lineHeight,
      fontFamily:
        settings.fontFamily === "serif"
          ? '"Songti SC", "Noto Serif SC", Georgia, serif'
          : '-apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", Arial, sans-serif',
    };

    return (
      <div className="read-page-inner" style={bodyStyle}>
        {isFirst && currentChapter && (
          <div className="read-reader-chapter-title">
            {currentChapter.title}
          </div>
        )}
        <div
          className="read-reader-body"
          ref={isActivePage ? activeBodyRef : undefined}
        >
          {nodes}
        </div>
        {isLast && (
          <div className="read-reader-end">— 本章完 —</div>
        )}
      </div>
    );
  }

  if (loadErr) {
    return (
      <div className="read-reader read-reader-error">
        <div className="read-reader-error-box">
          <div className="read-reader-error-title">{loadErr}</div>
          <button
            className="read-reader-error-btn"
            onClick={onExit}
          >
            返回书架
          </button>
        </div>
      </div>
    );
  }

  if (!text || !currentChapter) {
    return (
      <div className="read-reader read-reader-loading">
        <div className="read-reader-loading-text">正在打开…</div>
      </div>
    );
  }

  const totalChapters = chapters.length;
  const chapterProgress =
    pageCount > 0 ? pageIndex / pageCount : 0;
  const progressPct =
    totalChapters > 0
      ? ((chapterIndex + chapterProgress) / totalChapters) * 100
      : 100;

  const activeHighlight = activeHighlightId
    ? highlights.find((h) => h.id === activeHighlightId) ?? null
    : null;

  let underIdx = pageIndex;
  if (flip) {
    if (flip.dir === "next") {
      underIdx = Math.min(pageCount - 1, pageIndex + 1);
    } else {
      underIdx = pageIndex;
    }
  }

    const flipProgress = flip
    ? Math.min(1, Math.abs(flip.angle) / 90)
    : 0;

  return (
    <div className="read-reader" data-bg={settings.background}>
      <div
        className="read-reader-pad"
        style={{
          paddingTop: `${settings.paddingTop}px`,
          paddingBottom: `${settings.paddingBottom}px`,
        }}
      >
        <div
          ref={setStageEl}
          className="read-reader-stage-wrap"
        >
          <div className="read-stage">
            <div className="read-page read-page-under">
              {renderPage(underIdx, !flip)}
              {flip && (
                <div
                  className="read-page-under-shadow"
                  style={{ opacity: flipProgress }}
                />
              )}
            </div>
            {flip && (
              <div
                className="read-page read-page-flip"
                style={{
                  transform: `rotateY(${flip.angle}deg)`,
                  boxShadow: `-${flipProgress * 22}px 0 ${
                    flipProgress * 40
                  }px rgba(0, 0, 0, ${flipProgress * 0.28})`,
                }}
              >
                {renderPage(flip.from, false)}
                <div
                  className="read-page-flip-shade"
                  style={{ opacity: flipProgress }}
                />
                <div className="read-page-flip-edge" />
              </div>
            )}
          </div>
        </div>
      </div>

      {chromeVisible && (
        <header className="read-reader-top">
          <button
            className="read-reader-icon-btn"
            onClick={onExit}
            aria-label="返回"
          >
            <ChevronLeft size={24} strokeWidth={2.4} />
          </button>
          <div className="read-reader-book-title">{book.title}</div>
          <button
            className={
              session
                ? "read-reader-icon-btn is-together"
                : "read-reader-icon-btn"
            }
            onClick={() => setShowInvite(true)}
            aria-label="一起读"
          >
            {session ? (
              <Users size={18} strokeWidth={2.2} />
            ) : (
              <Plus size={18} strokeWidth={2.2} />
            )}
          </button>
          <button
            className="read-reader-icon-btn"
            onClick={() => setShowHighlights(true)}
            aria-label="我的高亮"
          >
            <Bookmark size={18} strokeWidth={2.2} />
          </button>
          <button
            className="read-reader-icon-btn"
            onClick={() => setShowToc(true)}
            aria-label="目录"
          >
            <List size={20} strokeWidth={2.2} />
          </button>
          <button
            className="read-reader-icon-btn"
            onClick={() => setShowSettings(true)}
            aria-label="设置"
          >
            <Settings size={18} strokeWidth={2.2} />
          </button>
        </header>
      )}

      {chromeVisible && session && (
        <div className="read-together-bar">
          <button
            className="read-together-main"
            onClick={() => setShowChat(true)}
            aria-label="打开一起读聊天"
          >
            <div className="read-together-avatars">
              {session.partners.includes("levi") && (
                <div className="read-together-avatar avatar-levi">
                  {avatars.levi ? (
                    <img src={avatars.levi} alt="Levi" />
                  ) : (
                    <span>L</span>
                  )}
                </div>
              )}
              {session.partners.includes("erwin") && (
                <div className="read-together-avatar avatar-erwin">
                  {avatars.erwin ? (
                    <img src={avatars.erwin} alt="Erwin" />
                  ) : (
                    <span>E</span>
                  )}
                </div>
              )}
            </div>
            <span className="read-together-label">一起读</span>
          </button>
          <button
            className="read-together-exit"
            onClick={handleEndSession}
            aria-label="结束一起读"
          >
            <X size={12} strokeWidth={2.6} />
          </button>
        </div>
      )}

      {chromeVisible && (
        <footer className="read-reader-bottom">
          <div className="read-reader-chapter-label">
            {currentChapter.title}
          </div>
          <div className="read-reader-progress-track">
            <div
              className="read-reader-progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="read-reader-progress-label">
            {chapterIndex + 1}/{totalChapters}
            {pageCount > 1 && (
              <span className="read-reader-page-label">
                {" "}
                · {pageIndex + 1}/{pageCount}
              </span>
            )}
          </div>
        </footer>
      )}

      {showToc && (
        <div
          className="read-reader-drawer-backdrop"
          onClick={() => setShowToc(false)}
        >
          <aside
            className="read-reader-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="read-reader-drawer-header">
              <h2>目录</h2>
              <button
                onClick={() => setShowToc(false)}
                aria-label="关闭"
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>
            <div className="read-reader-drawer-list">
              {chapters.map((c) => (
                <button
                  key={c.index}
                  className={
                    c.index === chapterIndex
                      ? "read-reader-drawer-item active"
                      : "read-reader-drawer-item"
                  }
                  onClick={() => jumpToChapter(c.index)}
                >
                  <span className="read-reader-drawer-item-title">
                    {c.title}
                  </span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}

      {showSettings && (
        <div
          className="read-reader-settings-backdrop"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="read-reader-settings"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="read-reader-settings-header">
              <h2>阅读设置</h2>
              <button
                onClick={() => setShowSettings(false)}
                aria-label="关闭"
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>

            <div className="read-reader-settings-group">
              <div className="read-reader-settings-label">背景</div>
              <div className="read-reader-bg-row">
                {BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    className={
                      settings.background === bg.id
                        ? "read-reader-bg-btn active"
                        : "read-reader-bg-btn"
                    }
                    data-bg={bg.id}
                    onClick={() =>
                      updateSettings({ background: bg.id })
                    }
                  >
                    <span>{bg.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="read-reader-settings-group">
              <div className="read-reader-settings-label">
                字号 {settings.fontSize}px
              </div>
              <input
                type="range"
                min={13}
                max={26}
                step={1}
                value={settings.fontSize}
                onChange={(e) =>
                  updateSettings({
                    fontSize: Number(e.target.value),
                  })
                }
                className="read-reader-slider"
              />
            </div>

            <div className="read-reader-settings-group">
              <div className="read-reader-settings-label">
                行距 {settings.lineHeight.toFixed(2)}
              </div>
              <input
                type="range"
                min={1.4}
                max={2.4}
                step={0.05}
                value={settings.lineHeight}
                onChange={(e) =>
                  updateSettings({
                    lineHeight: Number(e.target.value),
                  })
                }
                className="read-reader-slider"
              />
            </div>

            <div className="read-reader-settings-group">
              <div className="read-reader-settings-label">字体</div>
              <div className="read-reader-font-row">
                <button
                  className={
                    settings.fontFamily === "serif"
                      ? "read-reader-font-btn active"
                      : "read-reader-font-btn"
                  }
                  onClick={() =>
                    updateSettings({ fontFamily: "serif" })
                  }
                >
                  宋体
                </button>
                <button
                  className={
                    settings.fontFamily === "sans"
                      ? "read-reader-font-btn active"
                      : "read-reader-font-btn"
                  }
                  onClick={() =>
                    updateSettings({ fontFamily: "sans" })
                  }
                >
                  黑体
                </button>
              </div>
            </div>

            <div className="read-reader-settings-group">
              <div className="read-reader-settings-label">
                上边距 {settings.paddingTop}px
              </div>
              <input
                type="range"
                min={20}
                max={120}
                step={2}
                value={settings.paddingTop}
                onChange={(e) =>
                  updateSettings({
                    paddingTop: Number(e.target.value),
                  })
                }
                className="read-reader-slider"
              />
            </div>

            <div className="read-reader-settings-group">
              <div className="read-reader-settings-label">
                下边距 {settings.paddingBottom}px
              </div>
              <input
                type="range"
                min={40}
                max={160}
                step={2}
                value={settings.paddingBottom}
                onChange={(e) =>
                  updateSettings({
                    paddingBottom: Number(e.target.value),
                  })
                }
                className="read-reader-slider"
              />
            </div>

            <div className="read-reader-settings-group">
              <div className="read-reader-settings-label">
                一起读 · 每章划线上限 {chapterLimit}
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={chapterLimit}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setChapterLimit(v);
                  saveChapterLimit(v);
                }}
                className="read-reader-slider"
              />
            </div>
          </div>
        </div>
      )}

      {selection && (
        <HighlightActionMenu
          rect={selection.rect}
          onHighlight={handleCreateHighlight}
          onNote={handleCreateNote}
          onClose={closeSelectionMenu}
        />
      )}

      {editingNote && (
        <HighlightNoteEditor
          initial={editingNote.initial}
          quote={editingNote.quote}
          onSave={handleSaveNote}
          onCancel={() => {
            setEditingNote(null);
          }}
        />
      )}

      {activeHighlight && (
        <HighlightDetail
          highlight={activeHighlight}
          onClose={() => setActiveHighlightId(null)}
          onEditNote={() => {
            setEditingNote({
              highlightId: activeHighlight.id,
              quote: activeHighlight.text,
              initial: activeHighlight.note ?? "",
            });
            setActiveHighlightId(null);
          }}
          onDelete={() =>
            handleDeleteHighlight(activeHighlight.id)
          }
        />
      )}

      {showHighlights && (
        <HighlightsDrawer
          highlights={highlights}
          onClose={() => setShowHighlights(false)}
          onJump={handleJumpToHighlight}
          onDelete={(id) => handleDeleteHighlight(id)}
        />
      )}

      {showInvite && (
        <ReadInviteSheet
          onClose={() => setShowInvite(false)}
          onInvite={handleInvite}
        />
      )}

      {showChat && session && (
        <ReadChatPanel
          bookId={book.id}
          bookTitle={book.title}
          chapterIndex={chapterIndex}
          pageIndex={pageIndex}
          partners={session.partners}
          onClose={() => setShowChat(false)}
        />
      )}

      {toast && <div className="read-reader-toast">{toast}</div>}
    </div>
  );
}

function textOffsetIn(
  root: HTMLElement,
  node: Node,
  offsetInNode: number
): number {
  let total = 0;
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    null
  );
  let cur: Node | null = walker.nextNode();
  while (cur) {
    if (cur === node) {
      return total + offsetInNode;
    }
    total += cur.textContent?.length ?? 0;
    cur = walker.nextNode();
  }
  return -1;
}