"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { AppId } from "@/lib/systemStorage";
import type { HomeItem } from "@/data/home";

import PolaroidWidget from "@/components/home/widgets/PolaroidWidget";
import CountdownWidget from "@/components/home/widgets/CountdownWidget";
import LetterWidget from "@/components/home/widgets/LetterWidget";
import StudyWidget from "@/components/home/widgets/StudyWidget";
import DailyQuoteWidget from "@/components/home/widgets/DailyQuoteWidget";
import MusicWidget from "@/components/home/widgets/MusicWidget";
import { getAppUnreadCount } from "@/lib/unreadRegistry";

type AppMeta = {
  id: AppId;
  name: string;
  icon: string;
  color: string;
};

type HomeGridProps = {
  items: HomeItem[];
  apps: AppMeta[];
  iconUrls: Partial<Record<AppId, string>>;
  editing: boolean;
  currentPage: number;
  pageCount: number;
  onOpenApp: (id: AppId) => void;
  onChangeItems: (items: HomeItem[]) => void;
  onCrossPageDrop: (
    itemId: string,
    fromPage: number,
    toPage: number,
    toIdx: number | null
  ) => void;
  onRequestPageChange: (dir: "left" | "right") => void;
  onDeleteWidget: (itemId: string) => void;
};

type Dragging = {
  item: HomeItem;
  fromPage: number;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
};

const EDGE_PX = 44;
const EDGE_HOLD_MS = 550;

export default function HomeGrid({
  items,
  apps,
  iconUrls,
  editing,
  currentPage,
  pageCount,
  onOpenApp,
  onChangeItems,
  onCrossPageDrop,
  onRequestPageChange,
  onDeleteWidget,
}: HomeGridProps) {
  const [dragging, setDragging] = useState<Dragging | null>(
    null
  );
  const [hoveredId, setHoveredId] = useState<string | null>(
    null
  );
    const [unreadCounts, setUnreadCounts] = useState<
    Partial<Record<AppId, number>>
  >({});

  const gridRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<
    Record<string, HTMLDivElement | null>
  >({});

  const edgeTimerRef = useRef<number | null>(null);
  const edgeDirRef = useRef<"left" | "right" | null>(
    null
  );

  function handlePointerDown(
    item: HomeItem,
    e: React.PointerEvent<HTMLDivElement>
  ) {
    if (!editing) return;

    const target = e.target as HTMLElement;
    if (target.dataset.noDrag === "true") return;

    const el = itemRefs.current[item.id];
    if (!el) return;

    const rect = el.getBoundingClientRect();

    setDragging({
      item,
      fromPage: currentPage,
      x: e.clientX,
      y: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    });

    e.preventDefault();
  }

  useEffect(() => {
    if (!dragging) return;

    const dragItemId = dragging.item.id;
    const dragFromPage = dragging.fromPage;

    function handleMove(e: PointerEvent) {
      setDragging((prev) =>
        prev
          ? { ...prev, x: e.clientX, y: e.clientY }
          : null
      );

      const target = findItemAtPoint(
        e.clientX,
        e.clientY,
        dragItemId
      );
      setHoveredId(target);

      let dir: "left" | "right" | null = null;
      if (e.clientX < EDGE_PX) dir = "left";
      else if (e.clientX > window.innerWidth - EDGE_PX) {
        dir = "right";
      }

      if (dir === "left" && currentPage <= 0) dir = null;
      if (dir === "right" && currentPage >= pageCount - 1) {
        dir = null;
      }

      if (dir !== edgeDirRef.current) {
        if (edgeTimerRef.current !== null) {
          window.clearTimeout(edgeTimerRef.current);
          edgeTimerRef.current = null;
        }
        edgeDirRef.current = dir;

        if (dir) {
          edgeTimerRef.current = window.setTimeout(() => {
            edgeTimerRef.current = null;
            edgeDirRef.current = null;
            onRequestPageChange(dir!);
          }, EDGE_HOLD_MS);
        }
      }
    }

    function handleUp(e: PointerEvent) {
      /* iOS 系统可能触发 pointercancel 打断拖拽 —— 此时用拖动层的位置兜底 */
      const isCancel = e.type === "pointercancel";

      const targetId = isCancel
        ? findItemAtPoint(
            dragging ? dragging.x : e.clientX,
            dragging ? dragging.y : e.clientY,
            dragItemId
          )
        : findItemAtPoint(e.clientX, e.clientY, dragItemId);

      const fromIdx = items.findIndex(
        (it) => it.id === dragItemId
      );

      if (fromIdx !== -1) {
        if (targetId && targetId !== dragItemId) {
          const toIdx = items.findIndex(
            (it) => it.id === targetId
          );
          if (toIdx !== -1) {
            const next = [...items];
            const [moved] = next.splice(fromIdx, 1);
            next.splice(toIdx, 0, moved);
            onChangeItems(next);
          }
        }
      } else {
        const toIdx =
          targetId !== null
            ? items.findIndex((it) => it.id === targetId)
            : null;

        onCrossPageDrop(
          dragItemId,
          dragFromPage,
          currentPage,
          toIdx !== null && toIdx >= 0 ? toIdx : null
        );
      }

      if (edgeTimerRef.current !== null) {
        window.clearTimeout(edgeTimerRef.current);
        edgeTimerRef.current = null;
      }
      edgeDirRef.current = null;

      setDragging(null);
      setHoveredId(null);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);

    return () => {
      window.removeEventListener(
        "pointermove",
        handleMove
      );
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener(
        "pointercancel",
        handleUp
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dragging,
    items,
    currentPage,
    pageCount,
    onRequestPageChange,
    onCrossPageDrop,
    onChangeItems,
  ]);

  /* ★ 未读计数刷新（独立 effect） */
  useEffect(() => {
    function refresh() {
      const next: Partial<Record<AppId, number>> = {};
      for (const app of apps) {
        const c = getAppUnreadCount(app.id);
        if (c > 0) next[app.id] = c;
      }
      setUnreadCounts(next);
    }

    refresh();

    function onVisible() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }

    document.addEventListener(
      "visibilitychange",
      onVisible
    );
    window.addEventListener("focus", refresh);
    window.addEventListener(
      "runwithme:unread-update",
      refresh
    );

    const interval = window.setInterval(refresh, 5000);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        onVisible
      );
      window.removeEventListener("focus", refresh);
      window.removeEventListener(
        "runwithme:unread-update",
        refresh
      );
      window.clearInterval(interval);
    };
  }, [apps]);

  function findItemAtPoint(
    x: number,
    y: number,
    excludeId: string
  ): string | null {
    let result: string | null = null;

    for (const [id, el] of Object.entries(
      itemRefs.current
    )) {
      if (!el || id === excludeId) continue;

      const r = el.getBoundingClientRect();

      if (
        x >= r.left &&
        x <= r.right &&
        y >= r.top &&
        y <= r.bottom
      ) {
        result = id;
      }
    }

    return result;
  }

  const visibleItems = useMemo(() => {
    if (!dragging) return items;
    return items.filter((it) => it.id !== dragging.item.id);
  }, [items, dragging]);

  const isCrossPageDrag =
    dragging !== null && dragging.fromPage !== currentPage;

  return (
    <div
      ref={gridRef}
      className={`home-grid${editing ? " is-editing" : ""}`}
    >
      {visibleItems.map((item) => (
        <GridItem
          key={item.id}
          item={item}
          apps={apps}
          iconUrls={iconUrls}
          unreadCounts={unreadCounts}
          editing={editing}
          hovered={hoveredId === item.id}
          dragging={dragging?.item.id === item.id}
          onPointerDown={(e) => handlePointerDown(item, e)}
          onOpenApp={onOpenApp}
          onDeleteWidget={() => onDeleteWidget(item.id)}
          registerRef={(el) => {
            itemRefs.current[item.id] = el;
          }}
        />
      ))}

      {dragging && (
        <div
          className="home-grid-drag-layer"
          style={{
            position: "fixed",
            left: dragging.x - dragging.offsetX,
            top: dragging.y - dragging.offsetY,
            width: dragging.width,
            height: dragging.height,
            zIndex: 9999,
            pointerEvents: "none",
          }}
        >
          <FloatingItem
            item={dragging.item}
            apps={apps}
            iconUrls={iconUrls}
          />
        </div>
      )}

      {isCrossPageDrag && (
        <div className="home-grid-crosspage-hint">
          松手放到第 {currentPage + 1} 页
        </div>
      )}
    </div>
  );
}

/* =========================================================
   单个格子
   ========================================================= */

function GridItem({
  item,
  apps,
  iconUrls,
  unreadCounts,
  editing,
  hovered,
  dragging,
  onPointerDown,
  onOpenApp,
  onDeleteWidget,
  registerRef,
}: {
  item: HomeItem;
  apps: AppMeta[];
  iconUrls: Partial<Record<AppId, string>>;
  unreadCounts: Partial<Record<AppId, number>>;
  editing: boolean;
  hovered: boolean;
  dragging: boolean;
  onPointerDown: (
    e: React.PointerEvent<HTMLDivElement>
  ) => void;
  onOpenApp: (id: AppId) => void;
  onDeleteWidget: () => void;
  registerRef: (el: HTMLDivElement | null) => void;
}) {
  const isWidget = item.content.kind === "widget";
  const sizeClass = item.size
    ? ` size-${item.size}`
    : " size-1x1";

  function handleClick() {
    if (editing) return;
    if (item.content.kind === "app") {
      onOpenApp(item.content.appId);
    }
  }

  return (
    <div
      ref={registerRef}
      className={`home-grid-item${sizeClass}${
        editing ? " is-editing" : ""
      }${hovered ? " is-hovered" : ""}${
        dragging ? " is-dragging" : ""
      }`}
      onPointerDown={onPointerDown}
      onClick={handleClick}
    >
      {isWidget ? (
        <WidgetContent item={item} />
      ) : (
        <AppIconInner
          item={item}
          apps={apps}
          iconUrls={iconUrls}
          unreadCounts={unreadCounts}
        />
      )}

      {editing && isWidget && (
        <button
          className="home-grid-delete"
          data-no-drag="true"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteWidget();
          }}
          aria-label="删除"
        >
          ×
        </button>
      )}
    </div>
  );
}

/* =========================================================
   App 图标内部
   ========================================================= */

function AppIconInner({
  item,
  apps,
  iconUrls,
  unreadCounts,
}: {
  item: HomeItem;
  apps: AppMeta[];
  iconUrls: Partial<Record<AppId, string>>;
  unreadCounts?: Partial<Record<AppId, number>>;
}) {
  if (item.content.kind !== "app") return null;

  const appId = item.content.appId;
  const app = apps.find((a) => a.id === appId);
  if (!app) return null;

  const url = iconUrls[appId];
  const count = unreadCounts?.[appId] ?? 0;

  return (
    <div className="home-grid-app">
      <div className="app-icon-wrap">
        <div
          className={`app-icon app-${app.color}${
            url ? " app-icon-custom" : ""
          }`}
          data-app-icon={appId}
        >
          {url ? (
            <img
              src={url}
              alt={app.name}
              draggable={false}
            />
          ) : (
            <span>{app.icon}</span>
          )}
        </div>

        {count > 0 && (
          <span className="home-grid-unread-badge">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </div>

      <span className="app-name">{app.name}</span>
    </div>
  );
}

/* =========================================================
   小组件内容
   ========================================================= */

function WidgetContent({ item }: { item: HomeItem }) {
  if (item.content.kind !== "widget") return null;
  const w = item.content.widget;

  if (w.type === "polaroid") {
    return (
      <PolaroidWidget
        imageId={w.imageId}
        caption={w.caption}
        dateLabel={w.dateLabel}
      />
    );
  }

  if (w.type === "letter") {
    return <LetterWidget />;
  }

  if (w.type === "study") {
    return <StudyWidget />;
  }

  if (w.type === "daily-quote") {
    return <DailyQuoteWidget />;
  }

  if (w.type === "music") {
    return <MusicWidget />;
  }

  return (
    <CountdownWidget
      title={w.title}
      targetDate={w.targetDate}
    />
  );
}

/* =========================================================
   拖动中的 floating 层
   ========================================================= */

function FloatingItem({
  item,
  apps,
  iconUrls,
}: {
  item: HomeItem;
  apps: AppMeta[];
  iconUrls: Partial<Record<AppId, string>>;
}) {
  const sizeClass = item.size
    ? ` size-${item.size}`
    : " size-1x1";

  return (
    <div
      className={`home-grid-item${sizeClass} is-floating`}
    >
      {item.content.kind === "widget" ? (
        <WidgetContent item={item} />
      ) : (
        <AppIconInner
          item={item}
          apps={apps}
          iconUrls={iconUrls}
        />
      )}
    </div>
  );
}