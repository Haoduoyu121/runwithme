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
  onOpenApp: (id: AppId) => void;
  onChangeItems: (items: HomeItem[]) => void;
  onDeleteWidget: (itemId: string) => void;
};

type Dragging = {
  itemId: string;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
};

export default function HomeGrid({
  items,
  apps,
  iconUrls,
  editing,
  onOpenApp,
  onChangeItems,
  onDeleteWidget,
}: HomeGridProps) {
  const [dragging, setDragging] = useState<Dragging | null>(
    null
  );
  const [hoveredId, setHoveredId] = useState<string | null>(
    null
  );

  const gridRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<
    Record<string, HTMLDivElement | null>
  >({});

  function getAppMeta(appId: AppId): AppMeta | undefined {
    return apps.find((a) => a.id === appId);
  }

  /* ---------- Drag start ---------- */

  function handlePointerDown(
    item: HomeItem,
    e: React.PointerEvent<HTMLDivElement>
  ) {
    if (!editing) return;

    /* 忽略点击在删除按钮 */
    const target = e.target as HTMLElement;
    if (target.dataset.noDrag === "true") return;

    const el = itemRefs.current[item.id];
    if (!el) return;

    const rect = el.getBoundingClientRect();

    setDragging({
      itemId: item.id,
      x: e.clientX,
      y: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    });

    /* 阻止原生滚动手势 */
    e.preventDefault();
  }

  /* ---------- Global pointer move / up ---------- */

  useEffect(() => {
  if (!dragging) return;

  /* ★ 提前捕获 itemId，避免闭包里 narrowing 丢失 */
  const dragItemId = dragging.itemId;

  function handleMove(e: PointerEvent) {
    setDragging((prev) =>
      prev
        ? { ...prev, x: e.clientX, y: e.clientY }
        : null
    );

    /* 找到当前指针下的 item */
    const target = findItemAtPoint(
      e.clientX,
      e.clientY,
      dragItemId
    );
    setHoveredId(target);
  }

  function handleUp(e: PointerEvent) {
    const targetId = findItemAtPoint(
      e.clientX,
      e.clientY,
      dragItemId
    );

    if (targetId && targetId !== dragItemId) {
      const fromIdx = items.findIndex(
        (it) => it.id === dragItemId
      );
      const toIdx = items.findIndex(
        (it) => it.id === targetId
      );

      if (fromIdx !== -1 && toIdx !== -1) {
        const next = [...items];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        onChangeItems(next);
      }
    }

    setDragging(null);
    setHoveredId(null);
  }

  window.addEventListener("pointermove", handleMove);
  window.addEventListener("pointerup", handleUp);
  window.addEventListener("pointercancel", handleUp);

  return () => {
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", handleUp);
    window.removeEventListener("pointercancel", handleUp);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [dragging, items]);

  function findItemAtPoint(
    x: number,
    y: number,
    excludeId: string
  ): string | null {
    let result: string | null = null;

    for (const [id, el] of Object.entries(itemRefs.current)) {
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

  /* ---------- 渲染 ---------- */

  const draggingItem = dragging
    ? items.find((it) => it.id === dragging.itemId) ?? null
    : null;

  const visibleItems = useMemo(() => {
    if (!dragging) return items;
    return items.filter((it) => it.id !== dragging.itemId);
  }, [items, dragging]);

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
          editing={editing}
          hovered={hoveredId === item.id}
          dragging={dragging?.itemId === item.id}
          onPointerDown={(e) => handlePointerDown(item, e)}
          onOpenApp={onOpenApp}
          onDeleteWidget={() => onDeleteWidget(item.id)}
          registerRef={(el) => {
            itemRefs.current[item.id] = el;
          }}
        />
      ))}

      {/* 拖动中的 floating 层 */}
      {dragging && draggingItem && (
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
            item={draggingItem}
            apps={apps}
            iconUrls={iconUrls}
          />
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
  const sizeClass = item.size === "2x2" ? " is-large" : "";

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
        />
      )}

      {/* 编辑模式下删除小组件 */}
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
}: {
  item: HomeItem;
  apps: AppMeta[];
  iconUrls: Partial<Record<AppId, string>>;
}) {
  if (item.content.kind !== "app") return null;

  const appId = item.content.appId;
  const app = apps.find((a) => a.id === appId);
  if (!app) return null;

  const url = iconUrls[appId];

  return (
    <div className="home-grid-app">
      <div
        className={`app-icon app-${app.color}${
          url ? " app-icon-custom" : ""
        }`}
      >
        {url ? (
          <img src={url} alt={app.name} draggable={false} />
        ) : (
          <span>{app.icon}</span>
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
  const sizeClass = item.size === "2x2" ? " is-large" : "";

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