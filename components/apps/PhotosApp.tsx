"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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

import PhotoViewer from "@/components/apps/photos/PhotoViewer";
import CategoryManager from "@/components/apps/photos/CategoryManager";
import CategoryPicker from "@/components/apps/photos/CategoryPicker";

type PhotosAppProps = {
  onBack: () => void;
};

export default function PhotosApp({
  onBack,
}: PhotosAppProps) {
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

  /* 查看器（用 photoId 追踪，避免分类切换导致索引失效） */
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

  /* -------------------------------------------------------
     过滤后的照片
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

  /* 如果当前查看的照片因为分类切换离开了视图，关闭它 */
  useEffect(() => {
    if (viewerPhotoId && viewerIndex === null) {
      setViewerPhotoId(null);
    }
  }, [viewerPhotoId, viewerIndex]);

  /* -------------------------------------------------------
     上传（带压缩）
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

      /* 上传时如果当前在某具体分类下，自动归入该分类 */
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
    } finally {
      setUploading(false);
    }
  }

  /* -------------------------------------------------------
     更新
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

  /* -------------------------------------------------------
     删除
     ------------------------------------------------------- */

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
     多选
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
     长按 / 点击
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

    /* 移动超过 10px 就认为是滚动，取消长按 */
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

    /* 保持索引一致，避免闭包过期 */
    void index;
  }

  /* -------------------------------------------------------
     Render
     ------------------------------------------------------- */

  return (
    <main className="app-screen photos-app">
      <header className="photos-app-header">
        {selectionMode ? (
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
                Photos
              </div>
              <div className="photos-app-title-sub">
                {photos.length > 0
                  ? `${photos.length} 张照片`
                  : "还没有照片"}
              </div>
            </div>

            <button
              className="photos-app-upload"
              onClick={() =>
                setShowCategoryManager(true)
              }
              aria-label="分类管理"
            >
              ☰
            </button>

            <button
              className="photos-app-upload"
              onClick={() =>
                fileInputRef.current?.click()
              }
              disabled={uploading}
              aria-label="上传照片"
            >
              {uploading ? "…" : "＋"}
            </button>
          </>
        )}
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        multiple
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none", overflow: "hidden" }}
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            void handleUpload(files);
          }
          e.target.value = "";
        }}
      />

      {/* 分类 tabs */}
      {!selectionMode && (
        <div className="photos-app-tabs">
          <button
            className={
              activeCategory === "__all__"
                ? "photos-app-tab active"
                : "photos-app-tab"
            }
            onClick={() => setActiveCategory("__all__")}
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
                onClick={() => setActiveCategory(c.id)}
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
                    selectionMode ? " is-selecting" : ""
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
                    <img src={url} alt={photo.fileName} />
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

      {selectionMode && (
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

      {viewerIndex !== null && visiblePhotos[viewerIndex] && (
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
              setViewerPhotoId(visiblePhotos[next].id);
            }
          }}
          onUpdateDescription={handleUpdateDescription}
          onSetCategory={(id, categoryId) =>
            handleSetCategory([id], categoryId)
          }
          onDelete={(id) => {
            void handleDelete([id]);
          }}
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
    </main>
  );
}