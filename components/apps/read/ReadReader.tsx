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
  const [pageCount, setPageCount] = useState(1);
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

  /* ★ 一起读 */
  const { add: addToCollection } = useCollection();
  const { settings: systemSettings } = useSystem();

  const [session, setSession] = useState<ReadingSession | null>(
    null
  );
  const [showInvite, setShowInvite] = useState(false);
  const [chapterLimit, setChapterLimit] = useState(3);
  const [toast, setToast] = useState<string | null>(null);
  const avatars = useCharacterAvatars();

  /* 选中态 */
  const [selection, setSelection] = useState<{
    rect: DOMRect;
    chapterIndex: number;
    startOffset: number;
    endOffset: number;
    text: string;
  } | null>(null);

  /* 笔记编辑态 */
  const [editingNote, setEditingNote] = useState<{
    highlightId: string | null;
    quote: string;
    initial: string;
  } | null>(null);

  /* 详情态（点击已有 mark） */
  const [activeHighlightId, setActiveHighlightId] =
    useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pagesRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<number | null>(null);

  const chapterIndexRef = useRef(chapterIndex);
  const pageIndexRef = useRef(pageIndex);
  const pageCountRef = useRef(pageCount);
  useEffect(() => {
    chapterIndexRef.current = chapterIndex;
  }, [chapterIndex]);
  useEffect(() => {
    pageIndexRef.current = pageIndex;
  }, [pageIndex]);
  useEffect(() => {
    pageCountRef.current = pageCount;
  }, [pageCount]);

  /* ★ 首次挂载时读取划线上限 */
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

  /* ---------- 加载高亮 ---------- */

  useEffect(() => {
    setHighlights(loadHighlights(book.id));
  }, [book.id]);

  /* ---------- 章节 ---------- */

  const chapters = useMemo(() => {
    if (!text) return [];
    return getChapters(book.id, text);
  }, [text, book.id]);

  const currentChapter = chapters[chapterIndex] ?? null;

  const chapterText = useMemo(() => {
    if (!text || !currentChapter) return "";
    return getChapterText(text, currentChapter);
  }, [text, currentChapter]);

  /* ---------- 当前章节的高亮 ---------- */

  const chapterHighlights = useMemo(() => {
    return highlights.filter(
      (h) => h.chapterIndex === chapterIndex
    );
  }, [highlights, chapterIndex]);

  /* ---------- 一起读：翻页掷骰子 ---------- */

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
          sender:
            h.author === "levi" ? "Levi" : "Erwin",
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

  /* ---------- 24h 自主划线：打开书时判定 ---------- */

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

  /* ---------- 系统主动邀请：打开书时消费 pending ---------- */

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

   /* ---------- 列宽 + 页数（合并计算，锁定列数消除亚像素错位） ---------- */

  useLayoutEffect(() => {
    const scroll = scrollRef.current;
    const pages = pagesRef.current;
    if (!scroll || !pages) return;

    let raf = 0;

    function layout() {
      if (!scroll || !pages) return;
      const w = Math.floor(scroll.clientWidth);
      if (w <= 0) {
        raf = requestAnimationFrame(layout);
        return;
      }

      // 步骤 1：释放锁定，让浏览器按 columnWidth 自然多列排版
      pages.style.width = "";
      pages.style.columnCount = "";
      pages.style.columnWidth = `${w}px`;
      pages.style.columnGap = "0px";
      pages.style.columnFill = "auto";

      // 步骤 2：读一次 scrollWidth（触发重排）
      const sw1 = pages.scrollWidth;
      let count = Math.max(1, Math.ceil((sw1 - 0.5) / w));

      // 步骤 3：锁定 column-count + 明确 width
      //   每列宽 = width / count = w（消除亚像素累积误差）
      pages.style.columnWidth = "";
      pages.style.columnCount = String(count);
      pages.style.width = `${count * w}px`;

      // 步骤 4：若仍溢出（内容塞不下 count 列），加列重试
      let sw2 = pages.scrollWidth;
      let guard = 0;
      while (sw2 > count * w + 1 && guard < 200) {
        count++;
        pages.style.columnCount = String(count);
        pages.style.width = `${count * w}px`;
        sw2 = pages.scrollWidth;
        guard++;
      }

      setPageCount(count);

      // 步骤 5：对齐 scrollLeft 到整页
      const cur = Math.round(scroll.scrollLeft / w);
      const clamped = Math.max(0, Math.min(count - 1, cur));
      const target = clamped * w;
      if (Math.abs(scroll.scrollLeft - target) > 1) {
        scroll.scrollLeft = target;
      }
    }

    layout();

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(layout);
    });
    ro.observe(scroll);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [
    chapterText,
    settings.fontSize,
    settings.lineHeight,
    settings.fontFamily,
    chapterHighlights.length,
  ]);

  /* ---------- 恢复进度 ---------- */

  const restoredRef = useRef(false);
  useLayoutEffect(() => {
    if (restoredRef.current) return;

    const savedPage = book.progress.pageIndex ?? 0;
    if (savedPage <= 0) {
      restoredRef.current = true;
      return;
    }

    let attempts = 0;
    const tryRestore = () => {
      const scroll = scrollRef.current;
      if (!scroll) return;
      const w = scroll.clientWidth;
      if (w > 0) {
        scroll.scrollLeft = savedPage * w;
        restoredRef.current = true;
      } else if (attempts < 20) {
        attempts++;
        requestAnimationFrame(tryRestore);
      }
    };
    requestAnimationFrame(tryRestore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- 切章 ---------- */

  const prevChapterRef = useRef(chapterIndex);
  useEffect(() => {
    if (prevChapterRef.current === chapterIndex) return;
    prevChapterRef.current = chapterIndex;
    cancelAnim();
    const scroll = scrollRef.current;
    if (scroll) scroll.scrollLeft = 0;
    pageIndexRef.current = 0;
    setPageIndex(0);
  }, [chapterIndex]);

  /* ---------- 保存进度（翻页触发） ---------- */

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

  /* ---------- 保存进度（卸载时兜底） ---------- */

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
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- 动画工具 ---------- */

  function cancelAnim() {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  }

  function animateTo(target: number) {
    const scroll = scrollRef.current;
    if (!scroll) return;
    cancelAnim();
    const start = scroll.scrollLeft;
    const delta = target - start;
    if (Math.abs(delta) < 1) {
      scroll.scrollLeft = target;
      return;
    }
    const duration = 260;
    const t0 = performance.now();
    function step(now: number) {
      const el = scrollRef.current;
      if (!el) return;
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.scrollLeft = start + delta * eased;
      if (p < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        animRef.current = null;
        const w = el.clientWidth;
        if (w > 0) {
          const tp = Math.round(target / w);
          if (tp !== pageIndexRef.current) {
            pageIndexRef.current = tp;
            setPageIndex(tp);
          }
        }
      }
    }
    animRef.current = requestAnimationFrame(step);
  }

  /* ---------- 滚动：只更新页码，不做任何吸附 ---------- */

  function handleScroll() {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const w = scroll.clientWidth;
    if (w <= 0) return;
    const p = Math.round(scroll.scrollLeft / w);
    if (p !== pageIndexRef.current) {
      pageIndexRef.current = p;
      setPageIndex(p);
    }
  }

  /* ---------- 翻页（按钮 / 边缘点击） ---------- */

  function goPrevPage() {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const w = scroll.clientWidth;
    if (w <= 0) return;
    const cur = Math.round(scroll.scrollLeft / w);
    if (cur <= 0) {
      if (chapterIndex > 0) {
        setChapterIndex(chapterIndex - 1);
      }
      return;
    }
    animateTo((cur - 1) * w);
  }

  function goNextPage() {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const w = scroll.clientWidth;
    if (w <= 0) return;
    const cur = Math.round(scroll.scrollLeft / w);
    if (cur >= pageCountRef.current - 1) {
      if (chapterIndex < chapters.length - 1) {
        setChapterIndex(chapterIndex + 1);
      }
      return;
    }
    animateTo((cur + 1) * w);
  }

  /* ---------- 选区检测 ---------- */

  function checkSelection() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setSelection(null);
      return;
    }

    const body = bodyRef.current;
    if (!body) return;

    const range = sel.getRangeAt(0);
    if (!body.contains(range.commonAncestorContainer)) {
      setSelection(null);
      return;
    }

    const startOffset = textOffsetIn(
      body,
      range.startContainer,
      range.startOffset
    );
    const endOffset = textOffsetIn(
      body,
      range.endContainer,
      range.endOffset
    );

    if (startOffset < 0 || endOffset <= startOffset) {
      setSelection(null);
      return;
    }

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

  /* ---------- 原生 touch 手势：完全接管横向滚动 ---------- */

  const touchStateRef = useRef<{
    startX: number;
    startY: number;
    startScrollLeft: number;
    startT: number;
    moved: boolean;
    lockDir: "h" | "v" | null;
  } | null>(null);

  /* 用 ref 引用最新的回调，避免 useEffect 频繁重挂 */
  const goPrevRef = useRef(goPrevPage);
  const goNextRef = useRef(goNextPage);
  const checkSelectionRef = useRef(checkSelection);
  goPrevRef.current = goPrevPage;
  goNextRef.current = goNextPage;
  checkSelectionRef.current = checkSelection;

  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) {
        touchStateRef.current = null;
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target && target.closest("mark[data-hl-id]")) {
        touchStateRef.current = null;
        return;
      }
      const sc = scrollRef.current;
      if (!sc) return;
      const t = e.touches[0];

      cancelAnim();

      /* 若卡在两页之间，立即吸附到最近页，给手势一个干净起点 */
      const w = sc.clientWidth;
      if (w > 0) {
        const nearest = Math.round(sc.scrollLeft / w);
        const targetLeft = nearest * w;
        if (Math.abs(sc.scrollLeft - targetLeft) > 1) {
          sc.scrollLeft = targetLeft;
        }
      }

      touchStateRef.current = {
        startX: t.clientX,
        startY: t.clientY,
        startScrollLeft: sc.scrollLeft,
        startT: Date.now(),
        moved: false,
        lockDir: null,
      };
    }

    function onTouchMove(e: TouchEvent) {
      const state = touchStateRef.current;
      if (!state) return;
      if (e.touches.length !== 1) return;
      const sc = scrollRef.current;
      if (!sc) return;
      const t = e.touches[0];
      const dx = t.clientX - state.startX;
      const dy = t.clientY - state.startY;

      if (state.lockDir === null) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        state.lockDir =
          Math.abs(dx) >= Math.abs(dy) ? "h" : "v";
      }
      if (state.lockDir === "v") return;

      state.moved = true;
      sc.scrollLeft = state.startScrollLeft - dx;
    }

    function onTouchEnd(e: TouchEvent) {
      const state = touchStateRef.current;
      touchStateRef.current = null;
      if (!state) return;
      const sc = scrollRef.current;
      if (!sc) return;
      const w = sc.clientWidth;
      if (w <= 0) return;

      const t = e.changedTouches[0];
      const dx = state.startX - t.clientX; /* 正 = 手指向左滑 */
      const dy = state.startY - t.clientY;
      const dt = Math.max(1, Date.now() - state.startT);

      /* 文本选区兜底（长按高亮） */
      window.setTimeout(
        () => checkSelectionRef.current(),
        30
      );

      /* 轻触 → 点击翻页 / 切 UI */
      if (
        !state.moved &&
        Math.abs(dx) < 10 &&
        Math.abs(dy) < 10 &&
        dt < 300
      ) {
        const w2 = window.innerWidth;
        const x = t.clientX;
        if (x < 40) return; /* iOS 左边缘返回手势区 */
        if (x < w2 * 0.28) goPrevRef.current();
        else if (x > w2 * 0.72) goNextRef.current();
        else setChromeVisible((v) => !v);
        return;
      }

      if (!state.moved) return;

      /* 滑动 → 判定翻页或回弹 */
      const v = dx / dt; /* 正 = 向左快速滑 */
      const startPage = state.startScrollLeft / w;
      const nearest = Math.round(startPage);
      const threshold = w * 0.18;
      let targetPage = nearest;
      if (Math.abs(dx) > threshold || Math.abs(v) > 0.4) {
        targetPage = nearest + (dx > 0 ? 1 : -1);
      }
      targetPage = Math.max(
        0,
        Math.min(pageCountRef.current - 1, targetPage)
      );
      animateTo(targetPage * w);
    }

    scroll.addEventListener("touchstart", onTouchStart, {
      passive: true,
    });
    scroll.addEventListener("touchmove", onTouchMove, {
      passive: true,
    });
    scroll.addEventListener("touchend", onTouchEnd, {
      passive: true,
    });
    scroll.addEventListener("touchcancel", onTouchEnd, {
      passive: true,
    });

    return () => {
      scroll.removeEventListener(
        "touchstart",
        onTouchStart
      );
      scroll.removeEventListener("touchmove", onTouchMove);
      scroll.removeEventListener("touchend", onTouchEnd);
      scroll.removeEventListener(
        "touchcancel",
        onTouchEnd
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- 高亮操作 ---------- */

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
    startOffset: number
  ) {
    setChapterIndex(ci);
    requestAnimationFrame(() => {
      const scroll = scrollRef.current;
      const body = bodyRef.current;
      if (!scroll || !body) return;
      const w = scroll.clientWidth;
      if (w <= 0) return;
      const mark = body.querySelector(
        `mark[data-hl-id]`
      ) as HTMLElement | null;
      if (!mark) {
        scroll.scrollLeft = 0;
        return;
      }
      scroll.scrollLeft = 0;
    });
  }

  /* ---------- 设置 ---------- */

  function updateSettings(next: Partial<ReadSettings>) {
    const merged = { ...settings, ...next };
    setSettings(merged);
    saveReadSettings(merged);
  }

  function jumpToChapter(i: number) {
    setShowToc(false);
    setChapterIndex(i);
  }

  /* ---------- 一起读 ---------- */

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

  /* ---------- 渲染正文（带高亮） ---------- */

  const renderedBody: ReactNode = useMemo(() => {
    if (chapterHighlights.length === 0) {
      return chapterText;
    }
    const sorted = [...chapterHighlights].sort(
      (a, b) => a.startOffset - b.startOffset
    );
    const out: ReactNode[] = [];
    let cursor = 0;
    let key = 0;
    for (const h of sorted) {
      const start = Math.max(cursor, h.startOffset);
      const end = Math.min(chapterText.length, h.endOffset);
      if (end <= start) continue;
      if (start > cursor) {
        out.push(chapterText.slice(cursor, start));
      }
      out.push(
        <mark
          key={`hl-${h.id}-${key++}`}
          className={
            h.kind === "note"
              ? "read-hl read-hl-note"
              : "read-hl"
          }
          data-hl-id={h.id}
          data-hl-author={h.author}
          onClick={(e) => {
            e.stopPropagation();
            handleMarkClick(h.id);
          }}
        >
          {chapterText.slice(start, end)}
        </mark>
      );
      cursor = end;
    }
    if (cursor < chapterText.length) {
      out.push(chapterText.slice(cursor));
    }
    return out;
  }, [chapterText, chapterHighlights]);

  /* ---------- 加载态 ---------- */

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

  const bodyStyle: React.CSSProperties = {
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineHeight,
    fontFamily:
      settings.fontFamily === "serif"
        ? '"Songti SC", "Noto Serif SC", Georgia, serif'
        : '-apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", Arial, sans-serif',
  };

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

  return (
    <div
      className="read-reader"
      data-bg={settings.background}
    >
      <div
        className="read-reader-pad"
        style={{
          paddingTop: `${settings.paddingTop}px`,
          paddingBottom: `${settings.paddingBottom}px`,
        }}
      >
        <div
          ref={scrollRef}
          className="read-reader-scroll-h"
          onScroll={handleScroll}
        >
          <div
            ref={pagesRef}
            className="read-reader-pages"
            style={bodyStyle}
          >
            <div className="read-reader-chapter-title">
              {currentChapter.title}
            </div>
            <div
              ref={bodyRef}
              className="read-reader-body"
            >
              {renderedBody}
            </div>
            <div className="read-reader-end">
              — 本章完 —
            </div>
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
                    <img
                      src={avatars.levi}
                      alt="Levi"
                    />
                  ) : (
                    <span>L</span>
                  )}
                </div>
              )}
              {session.partners.includes("erwin") && (
                <div className="read-together-avatar avatar-erwin">
                  {avatars.erwin ? (
                    <img
                      src={avatars.erwin}
                      alt="Erwin"
                    />
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

/* ---------- 辅助：拿 node 在 root 内的文本 offset ---------- */

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