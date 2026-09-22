"use client";

import {
  useEffect,
  useLayoutEffect,
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

/* ★ 把角度同步到 DOM —— 不触发 React 重渲染 */
function applyFlipVisuals(
  angle: number,
  pageEl: HTMLDivElement | null,
  shadeEl: HTMLDivElement | null,
  underShadowEl: HTMLDivElement | null
) {
  const p = Math.min(1, Math.abs(angle) / 90);
  if (pageEl) {
    pageEl.style.transform = `rotateY(${angle}deg)`;
    pageEl.style.boxShadow = `-${p * 22}px 0 ${
      p * 40
    }px rgba(0, 0, 0, ${p * 0.28})`;
  }
  if (shadeEl) shadeEl.style.opacity = String(p);
  if (underShadowEl)
    underShadowEl.style.opacity = String(p);
}

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

  /* ★ 舞台 DOM，通过 callback ref 拿到 */
  const [stageEl, setStageEl] = useState<HTMLDivElement | null>(
    null
  );

  /* ★ flip 只记录 "正在翻页" 的元信息，不含角度 —— 角度在 DOM 上 */
  const [flip, setFlip] = useState<{
    dir: "next" | "prev";
    from: number;
  } | null>(null);

  /* ★ 直接操作 DOM 的 ref */
  const flipPageRef = useRef<HTMLDivElement | null>(null);
  const flipShadeRef = useRef<HTMLDivElement | null>(null);
  const underShadowRef = useRef<HTMLDivElement | null>(
    null
  );
  const currentAngleRef = useRef(0);
  const flipAnimRef = useRef<number | null>(null);

  /* ★ 待执行的自动翻页（点击边缘 / 按钮时用） */
  const flipPendingRef = useRef<{
    target: number;
    endPage: number;
  } | null>(null);

  const flippingRef = useRef(false);
  useEffect(() => {
    flippingRef.current = !!flip;
  }, [flip]);

  const activeBodyRef = useRef<HTMLDivElement | null>(null);

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

  /* ---------- 分页 ---------- */

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

  /* ---------- 一起读 / 自主划线 ---------- */

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

  /* ---------- 动画工具 ---------- */

  function cancelFlipAnim() {
    if (flipAnimRef.current !== null) {
      cancelAnimationFrame(flipAnimRef.current);
      flipAnimRef.current = null;
    }
  }

  /* ★ flip state 变化时：先应用起始角度，再启动自动动画（如果有 pending） */
  useLayoutEffect(() => {
    if (!flip) {
      currentAngleRef.current = 0;
      return;
    }

    /* DOM 已挂载，先把当前角度刷上去 */
    applyFlipVisuals(
      currentAngleRef.current,
      flipPageRef.current,
      flipShadeRef.current,
      underShadowRef.current
    );

    const pending = flipPendingRef.current;
    if (!pending) return;
    const target = pending.target;
    const endPage = pending.endPage;

    /* 自动动画 */
    cancelFlipAnim();
    const start = currentAngleRef.current;
    const t0 = performance.now();
    function step(now: number) {
      const p = Math.min(1, (now - t0) / FLIP_DURATION);
      const eased = 1 - Math.pow(1 - p, 3);
      const a = start + (target - start) * eased;
      currentAngleRef.current = a;
      applyFlipVisuals(
        a,
        flipPageRef.current,
        flipShadeRef.current,
        underShadowRef.current
      );
      if (p < 1) {
        flipAnimRef.current = requestAnimationFrame(step);
      } else {
        flipAnimRef.current = null;
        setPageIndex(endPage);
        pageIndexRef.current = endPage;
        flipPendingRef.current = null;
        setFlip(null);
      }
    }
    flipAnimRef.current = requestAnimationFrame(step);
    return () => {
      cancelFlipAnim();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flip]);

  /* 手势松手后的吸附动画 */
  function animateToAngle(target: number, endPage: number) {
    cancelFlipAnim();
    const start = currentAngleRef.current;
    const t0 = performance.now();
    function step(now: number) {
      const p = Math.min(1, (now - t0) / FLIP_DURATION);
      const eased = 1 - Math.pow(1 - p, 3);
      const a = start + (target - start) * eased;
      currentAngleRef.current = a;
      applyFlipVisuals(
        a,
        flipPageRef.current,
        flipShadeRef.current,
        underShadowRef.current
      );
      if (p < 1) {
        flipAnimRef.current = requestAnimationFrame(step);
      } else {
        flipAnimRef.current = null;
        if (endPage !== pageIndexRef.current) {
          setPageIndex(endPage);
          pageIndexRef.current = endPage;
        }
        setFlip(null);
      }
    }
    flipAnimRef.current = requestAnimationFrame(step);
  }

  function goNextPage() {
    if (flippingRef.current) return;
    const idx = pageIndexRef.current;
    const list = pagesRef.current;
    if (idx >= list.length - 1) {
      if (chapterIndex < chapters.length - 1) {
        setChapterIndex(chapterIndex + 1);
      }
      return;
    }
    currentAngleRef.current = 0;
    flipPendingRef.current = {
      target: -180,
      endPage: idx + 1,
    };
    setFlip({ dir: "next", from: idx });
  }

  function goPrevPage() {
    if (flippingRef.current) return;
    const idx = pageIndexRef.current;
    if (idx <= 0) {
      if (chapterIndex > 0) {
        setChapterIndex(chapterIndex - 1);
      }
      return;
    }
    currentAngleRef.current = -180;
    flipPendingRef.current = {
      target: 0,
      endPage: idx - 1,
    };
    setFlip({ dir: "prev", from: idx - 1 });
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
  goPrevRef.current = goPrevPage;
  goNextRef.current = goNextPage;

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
      if (flippingRef.current) {
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
        st.locked =
          Math.abs(dx) >= Math.abs(dy) ? "h" : "v";
      }
      if (st.locked === "v") return;

      st.moved = true;

      const w = W();

      /* 首次决定方向：挂载翻转页 + 初始化角度 */
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
          currentAngleRef.current = 0;
          flipPendingRef.current = null;
          setFlip({ dir: "next", from: idx });
        } else {
          if (
            idx <= 0 &&
            chapterIndexRef.current <= 0
          )
            return;
          st.dir = "prev";
          currentAngleRef.current = -180;
          flipPendingRef.current = null;
          setFlip({ dir: "prev", from: idx - 1 });
        }
        /* 立刻更新角度（ref 可能还没挂，但 currentAngleRef 会记下） */
        applyFlipVisuals(
          currentAngleRef.current,
          flipPageRef.current,
          flipShadeRef.current,
          underShadowRef.current
        );
        return;
      }

      if (st.dir === "next") {
        const progress = Math.max(
          0,
          Math.min(1, -dx / w)
        );
        const angle = -progress * 180;
        currentAngleRef.current = angle;
        applyFlipVisuals(
          angle,
          flipPageRef.current,
          flipShadeRef.current,
          underShadowRef.current
        );
      } else {
        const progress = Math.max(
          0,
          Math.min(1, dx / w)
        );
        const angle = -180 + progress * 180;
        currentAngleRef.current = angle;
        applyFlipVisuals(
          angle,
          flipPageRef.current,
          flipShadeRef.current,
          underShadowRef.current
        );
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

      /* 轻触：切 UI / 边缘翻页 */
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

      /* 滑动结束：吸附或回弹 */
      if (st.moved && st.dir) {
        const angle = currentAngleRef.current;
        const progress =
          st.dir === "next"
            ? Math.abs(angle) / 180
            : (angle + 180) / 180;
        const v = Math.abs(dx) / dt;
        const shouldFlip = progress > 0.3 || v > 0.5;
        const idx = pageIndexRef.current;
        if (shouldFlip) {
          if (st.dir === "next") {
            animateToAngle(-180, idx + 1);
          } else {
            animateToAngle(0, idx - 1);
          }
        } else {
          if (st.dir === "next") {
            animateToAngle(0, idx);
          } else {
            animateToAngle(-180, idx);
          }
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
      stage.removeEventListener(
        "touchcancel",
        onTouchEnd
      );
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
        endOffset: Math.min(
          slice.length,
          h.endOffset - range.start
        ),
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
            h.kind === "note"
              ? "read-hl read-hl-note"
              : "read-hl"
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
          <div className="read-reader-error-title">
            {loadErr}
          </div>
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
        <div className="read-reader-loading-text">
          正在打开…
        </div>
      </div>
    );
  }

  const totalChapters = chapters.length;
  const chapterProgress =
    pageCount > 0 ? pageIndex / pageCount : 0;
  const progressPct =
    totalChapters > 0
      ? ((chapterIndex + chapterProgress) /
          totalChapters) *
        100
      : 100;

  const activeHighlight = activeHighlightId
    ? highlights.find((h) => h.id === activeHighlightId) ??
      null
    : null;

  let underIdx = pageIndex;
  if (flip) {
    if (flip.dir === "next") {
      underIdx = Math.min(pageCount - 1, pageIndex + 1);
    } else {
      underIdx = pageIndex;
    }
  }

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
                  ref={underShadowRef}
                  className="read-page-under-shadow"
                  style={{ opacity: 0 }}
                />
              )}
            </div>
            {flip && (
              <div
                ref={flipPageRef}
                className="read-page read-page-flip"
                style={{ transform: "rotateY(0deg)" }}
              >
                {renderPage(flip.from, false)}
                <div
                  ref={flipShadeRef}
                  className="read-page-flip-shade"
                  style={{ opacity: 0 }}
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
          <div className="read-reader-book-title">
            {book.title}
          </div>
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
            <span className="read-together-label">
              一起读
            </span>
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
              <div className="read-reader-settings-label">
                背景
              </div>
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
                      updateSettings({
                        background: bg.id,
                      })
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
                    lineHeight: Number(
                      e.target.value
                    ),
                  })
                }
                className="read-reader-slider"
              />
            </div>

            <div className="read-reader-settings-group">
              <div className="read-reader-settings-label">
                字体
              </div>
              <div className="read-reader-font-row">
                <button
                  className={
                    settings.fontFamily === "serif"
                      ? "read-reader-font-btn active"
                      : "read-reader-font-btn"
                  }
                  onClick={() =>
                    updateSettings({
                      fontFamily: "serif",
                    })
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
                    updateSettings({
                      fontFamily: "sans",
                    })
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

      {toast && (
        <div className="read-reader-toast">{toast}</div>
      )}
    </div>
  );
}

/* ---------- 辅助 ---------- */

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