"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Image as ImageIcon,
  FileText,
} from "lucide-react";

import {
  loadPhotos,
  savePhotos,
  loadCategories,
  saveCategories,
  createPhotoId,
  createCategoryId,
  UNCATEGORIZED,
  type PhotoItem,
  type PhotoCategory,
} from "@/lib/photoStorage";

import {
  savePhotoFile,
  getPhotoFile,
  deletePhotoFile,
} from "@/lib/photoFiles";

import { compressImage } from "@/lib/photoUtils";
import { useCollection } from "@/lib/CollectionContext";
import {
  useCharacterAvatars,
  toAvatarKey,
} from "@/lib/useCharacterAvatars";

import {
  loadPhotoTextCards,
  savePhotoTextCards,
  loadPhotoTextPools,
  savePhotoTextPools,
  loadPhotoTextPending,
  savePhotoTextPending,
} from "@/lib/photoTextStorage";
import {
  runPhotoTextScheduler,
  createPendingShoot,
} from "@/lib/photoTextScheduler";
import type {
  PhotoTextCard,
  PhotoTextPending,
  PhotoTextPools,
} from "@/data/photoTextCards";

import PhotoViewer from "@/components/apps/photos/PhotoViewer";
import CategoryManager from "@/components/apps/photos/CategoryManager";
import CategoryPicker from "@/components/apps/photos/CategoryPicker";
import PhotoNamingModal, {
  displayPhotoName,
  type PhotoNamingItem,
} from "@/components/apps/photos/PhotoNamingModal";
import TextCard from "@/components/apps/photos/TextCard";
import TextCardViewer from "@/components/apps/photos/TextCardViewer";
import TextPoolEditor from "@/components/apps/photos/TextPoolEditor";

type PhotosAppProps = {
  onBack: () => void;
};

type ViewMode = "photos" | "text";

export default function PhotosApp({
  onBack,
}: PhotosAppProps) {
  const { tryAutoCollect } = useCollection();
  const avatars = useCharacterAvatars();

  const [viewMode, setViewMode] =
    useState<ViewMode>("photos");

  /* ---------- 照片 ---------- */
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [categories, setCategories] = useState<
    PhotoCategory[]
  >([]);
  const [urls, setUrls] = useState<Record<string, string>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [activeCategory, setActiveCategory] = useState<
    string
  >("__all__");

  const [viewerPhotoId, setViewerPhotoId] = useState<
    string | null
  >(null);

  const [selectionMode, setSelectionMode] =
    useState(false);
  const [selectedIds, setSelectedIds] = useState<
    string[]
  >([]);

  const [showCategoryManager, setShowCategoryManager] =
    useState(false);
  const [showCategoryPicker, setShowCategoryPicker] =
    useState(false);
  const [namingItems, setNamingItems] = useState<
    PhotoNamingItem[] | null
  >(null);

  /* ---------- 文字卡片 ---------- */
  const [textCards, setTextCards] = useState<
    PhotoTextCard[]
  >([]);
  const [pools, setPools] = useState<PhotoTextPools>({
    place: [],
    weather: [],
    person: [],
    action: [],
    mood: [],
  });
  const [pending, setPending] =
    useState<PhotoTextPending | null>(null);
  const [viewerTextCardId, setViewerTextCardId] =
    useState<string | null>(null);
  const [showTextPoolEditor, setShowTextPoolEditor] =
    useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(
    null
  );

  const longPressTimer = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);
  const longPressTriggered = useRef(false);
  const touchStartRef = useRef<{
    x: number;
    y: number;
  } | null>(null);

  const createdUrlsRef = useRef<Set<string>>(new Set());

  /* -------------------------------------------------------
     初始化
     ------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const meta = loadPhotos();
      setPhotos(meta);
      setCategories(loadCategories());

      const initialPools = loadPhotoTextPools();
      setPools(initialPools);

      const existingCards = loadPhotoTextCards();
      const generated =
        runPhotoTextScheduler(initialPools);

      if (generated.length > 0) {
        const merged = [...generated, ...existingCards];
        savePhotoTextCards(merged);
        setTextCards(merged);
      } else {
        setTextCards(existingCards);
      }

      const existingPending = loadPhotoTextPending();
      setPending(existingPending);

      const nextUrls: Record<string, string> = {};

      for (const item of meta) {
        try {
          const blob = await getPhotoFile(item.id);
          if (!blob) continue;
          const url = URL.createObjectURL(blob);
          createdUrlsRef.current.add(url);
          nextUrls[item.id] = url;
        } catch (e) {
          console.error("读取照片失败:", item.id, e);
        }
      }

      if (cancelled) {
        Object.values(nextUrls).forEach((url) =>
          URL.revokeObjectURL(url)
        );
        return;
      }

      setUrls(nextUrls);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      createdUrlsRef.current.forEach((url) =>
        URL.revokeObjectURL(url)
      );
      createdUrlsRef.current.clear();
    };
  }, []);

  /* pending 每秒 tick */
  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [pending]);

  /* pending 到点 → 结算 */
  useEffect(() => {
    if (!pending) return;
    if (Date.now() < pending.resolveAt) return;

    if (pending.cards.length > 0) {
      const next = [...pending.cards, ...textCards];
      setTextCards(next);
      savePhotoTextCards(next);

      const authors = Array.from(
        new Set(pending.cards.map((c) => c.author))
      );
      const label =
        authors.length === 2
          ? "Levi 和 Erwin"
          : authors[0];
      const count = pending.cards.length;
      setToast(`${label}上传了 ${count} 张`);
    } else {
      setToast("还没有人拍照哦");
    }

    setPending(null);
    savePhotoTextPending(null);

    const delay =
      pending.cards.length > 0 ? 3000 : 2400;
    window.setTimeout(() => setToast(null), delay);
  }, [tick, pending, textCards]);

  /* -------------------------------------------------------
     照片：过滤
     ------------------------------------------------------- */

  const visiblePhotos = useMemo(() => {
    if (activeCategory === "__all__") return photos;
    if (activeCategory === UNCATEGORIZED) {
      return photos.filter((p) => !p.categoryId);
    }
    return photos.filter(
      (p) => p.categoryId === activeCategory
    );
  }, [photos, activeCategory]);

  const viewerIndex = useMemo(() => {
    if (!viewerPhotoId) return null;
    const idx = visiblePhotos.findIndex(
      (p) => p.id === viewerPhotoId
    );
    return idx >= 0 ? idx : null;
  }, [visiblePhotos, viewerPhotoId]);

  useEffect(() => {
    if (viewerPhotoId && viewerIndex === null) {
      setViewerPhotoId(null);
    }
  }, [viewerPhotoId, viewerIndex]);

  /* -------------------------------------------------------
     照片：上传
     ------------------------------------------------------- */

  async function handleUpload(files: FileList) {
    const list = Array.from(files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (list.length === 0) return;

    setUploading(true);

    try {
      const newItems: PhotoItem[] = [];
      const newUrls: Record<string, string> = {};

      let defaultCategory: string | null = null;
      if (
        activeCategory !== "__all__" &&
        activeCategory !== UNCATEGORIZED
      ) {
        defaultCategory = activeCategory;
      }

      for (const file of list) {
        try {
          const { blob } = await compressImage(file);
          const id = createPhotoId();
          await savePhotoFile(id, blob);
          const url = URL.createObjectURL(blob);
          createdUrlsRef.current.add(url);

          newItems.push({
            id,
            fileName: file.name,
            description: "",
            createdAt: Date.now(),
            categoryId: defaultCategory,
          });
          newUrls[id] = url;
        } catch (e) {
          console.error("保存照片失败:", e);
        }
      }

      if (newItems.length === 0) return;

      const ordered = [...newItems].reverse();

      setPhotos((prev) => {
        const next = [...ordered, ...prev];
        savePhotos(next);
        return next;
      });

      setUrls((prev) => ({ ...prev, ...newUrls }));

      setNamingItems(
        ordered.map((it) => ({
          id: it.id,
          fileName: it.fileName,
          url: newUrls[it.id] ?? "",
        }))
      );
    } finally {
      setUploading(false);
    }
  }

  function handleNamingConfirm(
    names: Record<string, string>
  ) {
    if (!namingItems) return;

    setPhotos((prev) => {
      const next = prev.map((p) => {
        if (!(p.id in names)) return p;
        const raw = (names[p.id] ?? "").trim();
        return raw ? { ...p, description: raw } : p;
      });
      savePhotos(next);
      return next;
    });

    for (const it of namingItems) {
      const raw = (names[it.id] ?? "").trim();
      const displayName =
        raw || displayPhotoName(it.fileName);

      tryAutoCollect({
        source: "photos",
        sourceId: it.id,
        content: `photo「${displayName}」`,
        sender: "You",
        originalAt: Date.now(),
      });
    }

    setNamingItems(null);
  }

  function handleNamingSkip() {
    if (!namingItems) return;

    for (const it of namingItems) {
      const displayName = displayPhotoName(it.fileName);

      tryAutoCollect({
        source: "photos",
        sourceId: it.id,
        content: `photo「${displayName}」`,
        sender: "You",
        originalAt: Date.now(),
      });
    }

    setNamingItems(null);
  }

  /* -------------------------------------------------------
     照片：更新 / 分类 / 删除
     ------------------------------------------------------- */

  function handleUpdateDescription(
    id: string,
    description: string
  ) {
    setPhotos((prev) => {
      const next = prev.map((p) =>
        p.id === id ? { ...p, description } : p
      );
      savePhotos(next);
      return next;
    });
  }

  function handleSetCategory(
    ids: string[],
    categoryId: string | null
  ) {
    setPhotos((prev) => {
      const set = new Set(ids);
      const next = prev.map((p) =>
        set.has(p.id) ? { ...p, categoryId } : p
      );
      savePhotos(next);
      return next;
    });
  }

  async function handleDelete(ids: string[]) {
    for (const id of ids) {
      try {
        await deletePhotoFile(id);
      } catch (e) {
        console.error("删除照片文件失败:", e);
      }
      const url = urls[id];
      if (url) {
        URL.revokeObjectURL(url);
        createdUrlsRef.current.delete(url);
      }
    }

    const idSet = new Set(ids);

    setUrls((prev) => {
      const next = { ...prev };
      ids.forEach((id) => delete next[id]);
      return next;
    });

    setPhotos((prev) => {
      const next = prev.filter((p) => !idSet.has(p.id));
      savePhotos(next);
      return next;
    });

    if (viewerPhotoId && idSet.has(viewerPhotoId)) {
      setViewerPhotoId(null);
    }
  }

  /* -------------------------------------------------------
     分类
     ------------------------------------------------------- */

  function handleCreateCategory(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    const next: PhotoCategory[] = [
      ...categories,
      {
        id: createCategoryId(),
        name: trimmed,
        createdAt: Date.now(),
      },
    ];

    setCategories(next);
    saveCategories(next);
  }

  function handleRenameCategory(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    const next = categories.map((c) =>
      c.id === id ? { ...c, name: trimmed } : c
    );

    setCategories(next);
    saveCategories(next);
  }

  function handleDeleteCategory(id: string) {
    const confirmed = window.confirm(
      "删除分类不会删除照片，照片会变成未分类。继续？"
    );
    if (!confirmed) return;

    setCategories((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveCategories(next);
      return next;
    });

    setPhotos((prev) => {
      const next = prev.map((p) =>
        p.categoryId === id
          ? { ...p, categoryId: null }
          : p
      );
      savePhotos(next);
      return next;
    });

    if (activeCategory === id) {
      setActiveCategory("__all__");
    }
  }

  /* -------------------------------------------------------
     照片：多选
     ------------------------------------------------------- */

  function enterSelectionMode(initialId: string) {
    setSelectionMode(true);
    setSelectedIds([initialId]);
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds([]);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  }

  function selectAll() {
    setSelectedIds(visiblePhotos.map((p) => p.id));
  }

  function deselectAll() {
    setSelectedIds([]);
  }

  /* -------------------------------------------------------
     照片：长按 / 点击
     ------------------------------------------------------- */

  function handlePointerDown(
    id: string,
    e: React.PointerEvent
  ) {
    longPressTriggered.current = false;

    touchStartRef.current = {
      x: e.clientX,
      y: e.clientY,
    };

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }

    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      enterSelectionMode(id);
    }, 500);
  }

  function handlePointerMove(e: React.PointerEvent) {
    const start = touchStartRef.current;
    if (!start) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;

    if (dx * dx + dy * dy > 100) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
  }

  function handlePointerUp() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchStartRef.current = null;
  }

  function handleCellClick(id: string, index: number) {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    if (selectionMode) {
      toggleSelect(id);
      return;
    }
    setViewerPhotoId(id);
    void index;
  }

  /* -------------------------------------------------------
     文字卡片：CRUD
     ------------------------------------------------------- */

  function commitTextCards(next: PhotoTextCard[]) {
    setTextCards(next);
    savePhotoTextCards(next);
  }

  function commitPools(next: PhotoTextPools) {
    setPools(next);
    savePhotoTextPools(next);
  }

  /** 点 ✦ → 创建 pending（1-3 min 后结算） */
  function handleShoot() {
    if (pending) {
      setToast("他们还在拍，等一下");
      window.setTimeout(() => setToast(null), 2000);
      return;
    }

    const p = createPendingShoot(pools);
    if (!p) {
      setToast("词库是空的，先到 ☰ 里补充");
      window.setTimeout(() => setToast(null), 2600);
      return;
    }

    setPending(p);
    savePhotoTextPending(p);
  }

  function handleUpdateTextCard(next: PhotoTextCard) {
    commitTextCards(
      textCards.map((c) => (c.id === next.id ? next : c))
    );
  }

  function handleDeleteTextCard(id: string) {
    commitTextCards(
      textCards.filter((c) => c.id !== id)
    );
    if (viewerTextCardId === id) {
      setViewerTextCardId(null);
    }
  }




  const viewerTextCard = viewerTextCardId
    ? textCards.find((c) => c.id === viewerTextCardId) ??
      null
    : null;

  function formatCountdown(ms: number): string {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, "0")}:${String(
      s
    ).padStart(2, "0")}`;
  }

  /* -------------------------------------------------------
     Render
     ------------------------------------------------------- */

  const isPhotoMode = viewMode === "photos";

  return (
    <main className="app-screen photos-app">
      <header className="photos-app-header">
        {selectionMode && isPhotoMode ? (
          <>
            <button
              className="photos-app-back"
              onClick={exitSelectionMode}
              aria-label="取消"
            >
              ✕
            </button>

            <div className="photos-app-title">
              <div className="photos-app-title-main">
                已选 {selectedIds.length} 张
              </div>
              <div className="photos-app-title-sub">
                {selectedIds.length ===
                  visiblePhotos.length &&
                visiblePhotos.length > 0
                  ? "已全选"
                  : "点击继续选择"}
              </div>
            </div>

            <button
              className="photos-app-upload photos-app-upload-text"
              onClick={
                selectedIds.length ===
                  visiblePhotos.length &&
                visiblePhotos.length > 0
                  ? deselectAll
                  : selectAll
              }
            >
              {selectedIds.length ===
                visiblePhotos.length &&
              visiblePhotos.length > 0
                ? "取消全选"
                : "全选"}
            </button>
          </>
        ) : (
          <>
            <button
              className="photos-app-back"
              onClick={onBack}
              aria-label="返回"
            >
              ‹
            </button>

            <div className="photos-app-title">
              <div className="photos-app-title-main">
                {isPhotoMode ? "Photos" : "Text"}
              </div>
              <div className="photos-app-title-sub">
                {isPhotoMode
                  ? photos.length > 0
                    ? `${photos.length} 张照片`
                    : "还没有照片"
                  : textCards.length > 0
                    ? `${textCards.length} 张文字`
                    : "还没有文字卡片"}
              </div>
            </div>

            <button
              className="photos-app-upload"
              onClick={() => {
                if (isPhotoMode) {
                  setShowCategoryManager(true);
                } else {
                  setShowTextPoolEditor(true);
                }
              }}
              aria-label={isPhotoMode ? "分类管理" : "词库"}
            >
              ☰
            </button>

            <button
              className="photos-app-upload"
              onClick={() => {
                if (isPhotoMode) {
                  fileInputRef.current?.click();
                } else {
                  handleShoot();
                }
              }}
              disabled={
                (isPhotoMode && uploading) ||
                (!isPhotoMode && !!pending)
              }
              aria-label={isPhotoMode ? "上传照片" : "拍一张"}
            >
              {isPhotoMode ? (uploading ? "…" : "＋") : "✦"}
            </button>

            <button
              className="photos-app-upload"
              onClick={() =>
                setViewMode(
                  isPhotoMode ? "text" : "photos"
                )
              }
              aria-label={
                isPhotoMode ? "切到文字" : "切到照片"
              }
            >
              {isPhotoMode ? (
                <FileText size={18} strokeWidth={2} />
              ) : (
                <ImageIcon size={18} strokeWidth={2} />
              )}
            </button>
          </>
        )}
      </header>

      <input
        ref={fileInputRef}
        type="file"
        className="ios-file-input-detached"
        accept="image/*"
        multiple
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            void handleUpload(files);
          }
          e.target.value = "";
        }}
      />

      {/* ---------- 照片模式 ---------- */}
      {isPhotoMode && (
        <>
          {!selectionMode && (
            <div className="photos-app-tabs">
              <button
                className={
                  activeCategory === "__all__"
                    ? "photos-app-tab active"
                    : "photos-app-tab"
                }
                onClick={() =>
                  setActiveCategory("__all__")
                }
              >
                全部
                <span className="photos-app-tab-count">
                  {photos.length}
                </span>
              </button>

              {categories.map((c) => {
                const count = photos.filter(
                  (p) => p.categoryId === c.id
                ).length;
                return (
                  <button
                    key={c.id}
                    className={
                      activeCategory === c.id
                        ? "photos-app-tab active"
                        : "photos-app-tab"
                    }
                    onClick={() =>
                      setActiveCategory(c.id)
                    }
                  >
                    {c.name}
                    <span className="photos-app-tab-count">
                      {count}
                    </span>
                  </button>
                );
              })}

              <button
                className={
                  activeCategory === UNCATEGORIZED
                    ? "photos-app-tab active"
                    : "photos-app-tab"
                }
                onClick={() =>
                  setActiveCategory(UNCATEGORIZED)
                }
              >
                未分类
                <span className="photos-app-tab-count">
                  {
                    photos.filter((p) => !p.categoryId)
                      .length
                  }
                </span>
              </button>
            </div>
          )}

          <div
            className={`photos-app-content${
              selectionMode ? " has-selection-bar" : ""
            }`}
          >
            {loading ? (
              <div className="photos-app-empty">
                正在加载…
              </div>
            ) : visiblePhotos.length === 0 ? (
              <div className="photos-app-empty">
                <div className="photos-app-empty-icon">
                  ▧
                </div>
                <div className="photos-app-empty-title">
                  {photos.length === 0
                    ? "还没有照片"
                    : "这个分类下还没有照片"}
                </div>
                <div className="photos-app-empty-desc">
                  点右上角 ＋ 上传
                </div>
                <button
                  className="photos-app-empty-btn"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                >
                  上传照片
                </button>
              </div>
            ) : (
              <div className="photos-app-grid">
                {visiblePhotos.map((photo, idx) => {
                  const url = urls[photo.id];
                  const selected = selectedIds.includes(
                    photo.id
                  );
                  return (
                    <button
                      key={photo.id}
                      className={`photos-app-cell${
                        selectionMode
                          ? " is-selecting"
                          : ""
                      }${selected ? " is-selected" : ""}`}
                      onClick={() =>
                        handleCellClick(photo.id, idx)
                      }
                      onPointerDown={(e) =>
                        handlePointerDown(photo.id, e)
                      }
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      onPointerLeave={handlePointerUp}
                      type="button"
                    >
                      {url ? (
                        <img
                          src={url}
                          alt={photo.fileName}
                        />
                      ) : (
                        <span className="photos-app-cell-loading">
                          …
                        </span>
                      )}
                      {photo.description && (
                        <span className="photos-app-cell-dot" />
                      )}
                      {selectionMode && (
                        <span className="photos-app-cell-check">
                          {selected ? "✓" : ""}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ---------- 文字模式 ---------- */}
      {!isPhotoMode && (
        <div className="photos-app-content">
          {textCards.length === 0 ? (
            <div className="photos-app-empty">
              <div className="photos-app-empty-icon">
                ✦
              </div>
              <div className="photos-app-empty-title">
                {pending
                  ? "他们正在上传…"
                  : "还没有人拍照"}
              </div>
              <div className="photos-app-empty-desc">
                {pending
                  ? "稍等一下"
                  : "点右上角 ✦ 让他们拍一张"}
              </div>
              {!pending && (
                <button
                  className="photos-app-empty-btn"
                  onClick={handleShoot}
                >
                  拍一张
                </button>
              )}
            </div>
          ) : (
            <div className="photo-text-grid">
              {textCards.map((card) => (
                <button
                  key={card.id}
                  className="photo-text-grid-cell"
                  onClick={() =>
                    setViewerTextCardId(card.id)
                  }
                  type="button"
                >
                  <TextCard
                    card={card}
                    variant="grid"
                    avatars={avatars}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- 照片：底部多选条 ---------- */}
      {isPhotoMode && selectionMode && (
        <div className="photos-app-selection-bar">
          <button
            className="photos-app-selection-btn photos-app-selection-delete"
            disabled={selectedIds.length === 0}
            onClick={() => {
              if (selectedIds.length === 0) return;
              const confirmed = window.confirm(
                `确定删除已选的 ${selectedIds.length} 张照片吗？`
              );
              if (!confirmed) return;
              void handleDelete(selectedIds);
              exitSelectionMode();
            }}
          >
            删除
          </button>

          <button
            className="photos-app-selection-btn"
            disabled={selectedIds.length === 0}
            onClick={() => setShowCategoryPicker(true)}
          >
            移动到分类
          </button>
        </div>
      )}

      {isPhotoMode &&
        viewerIndex !== null &&
        visiblePhotos[viewerIndex] && (
          <PhotoViewer
            photos={visiblePhotos}
            urls={urls}
            index={viewerIndex}
            categories={categories}
            onClose={() => setViewerPhotoId(null)}
            onNavigate={(next) => {
              if (
                next >= 0 &&
                next < visiblePhotos.length
              ) {
                setViewerPhotoId(
                  visiblePhotos[next].id
                );
              }
            }}
            onUpdateDescription={
              handleUpdateDescription
            }
            onSetCategory={(id, categoryId) =>
              handleSetCategory([id], categoryId)
            }
            onDelete={(id) => {
              void handleDelete([id]);
            }}
          />
        )}

      {viewerTextCard && (
        <TextCardViewer
          card={viewerTextCard}
          pools={pools}
          avatars={avatars}
          onChange={handleUpdateTextCard}
          onDelete={() =>
            handleDeleteTextCard(viewerTextCard.id)
          }
          onPoolsChange={commitPools}
          onClose={() => setViewerTextCardId(null)}
        />
      )}

      {showCategoryManager && (
        <CategoryManager
          categories={categories}
          onClose={() => setShowCategoryManager(false)}
          onCreate={handleCreateCategory}
          onRename={handleRenameCategory}
          onDelete={handleDeleteCategory}
        />
      )}

      {showCategoryPicker && (
        <CategoryPicker
          categories={categories}
          count={selectedIds.length}
          onClose={() => setShowCategoryPicker(false)}
          onPick={(categoryId) => {
            handleSetCategory(selectedIds, categoryId);
            setShowCategoryPicker(false);
            exitSelectionMode();
          }}
        />
      )}

      {showTextPoolEditor && (
        <TextPoolEditor
          pools={pools}
          onChange={commitPools}
          onClose={() => setShowTextPoolEditor(false)}
        />
      )}

      {namingItems && (
        <PhotoNamingModal
          items={namingItems}
          onConfirm={handleNamingConfirm}
          onSkip={handleNamingSkip}
        />
      )}

      {/* ---------- 文字浮层提醒 ---------- */}
      {!isPhotoMode && pending && (
        <div className="photo-text-float">
          <div className="photo-text-float-avatars">
            {(["Levi", "Erwin"] as const).map((c) => {
              const key = toAvatarKey(c);
              const url = key ? avatars[key] : null;
              return (
                <span
                  key={c}
                  className={`photo-text-float-avatar photo-text-float-avatar-${c.toLowerCase()}${
                    url ? " has-image" : ""
                  }`}
                >
                  {url ? (
                    <img src={url} alt={c} />
                  ) : (
                    c.charAt(0)
                  )}
                </span>
              );
            })}
          </div>
          <span className="photo-text-float-label">
            正在上传图片…
          </span>
          <span className="photo-text-float-count">
            {formatCountdown(pending.resolveAt - Date.now())}
          </span>
        </div>
      )}

      {!isPhotoMode && !pending && toast && (
        <div className="photo-text-float photo-text-float-toast">
          <span className="photo-text-float-label">
            {toast}
          </span>
        </div>
      )}
    </main>
  );
}