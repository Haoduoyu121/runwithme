"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import {
  fetchWorldEvents,
  markWorldEventRead,
  eventHeadline,
  eventPreview,
  eventTimeAgo,
  type WorldEvent,
} from "@/lib/worldApi";

const CHECK_DELAY_MS = 3000;

export default function WorldCard() {
  const [events, setEvents] = useState<WorldEvent[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);
  const loadedRef = useRef(false);

  /* 打开时拉一次 */
  useEffect(() => {
    const t = window.setTimeout(async () => {
      try {
        const { events: list } = await fetchWorldEvents(
          20
        );
        const unread = list.filter(
          (e) => e.readAt === null
        );
        if (unread.length === 0) return;
        setEvents(unread);
        setVisible(true);
      } catch (e) {
        console.warn("[WorldCard] 拉取失败:", e);
      }
    }, CHECK_DELAY_MS);

    return () => window.clearTimeout(t);
  }, []);

  async function handleDismiss() {
    setVisible(false);
    // 全部标记已读
    for (const e of events) {
      try {
        await markWorldEventRead(e.id);
      } catch {}
    }
    setEvents([]);
    setExpanded(false);
  }

  if (!visible || events.length === 0) return null;

  /* 一条：直接显示内容 */
  if (events.length === 1) {
    const e = events[0];
    return (
      <div
        className="world-card"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="world-card-row">
          <span className="world-card-dot" />
          <span className="world-card-head">
            {eventHeadline(e)}
          </span>
          <span className="world-card-time">
            {eventTimeAgo(e.createdAt)}
          </span>
        </div>

        {expanded && eventPreview(e) && (
          <div className="world-card-preview">
            {eventPreview(e)}
          </div>
        )}

        {expanded && (
          <button
            className="world-card-dismiss"
            onClick={(ev) => {
              ev.stopPropagation();
              void handleDismiss();
            }}
          >
            知道了
          </button>
        )}
      </div>
    );
  }

  /* 多条：显示数量 + 展开列表 */
  return (
    <div className="world-card">
      <div
        className="world-card-row"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="world-card-dot" />
        <span className="world-card-head">
          {events.length} 件事，你不在的时候
        </span>
        <span className="world-card-time">
          {eventTimeAgo(events[0].createdAt)}
        </span>
      </div>

      {expanded && (
        <div className="world-card-list">
          {events.map((e) => (
            <div
              key={e.id}
              className="world-card-item"
            >
              <div className="world-card-item-head">
                <span>{eventHeadline(e)}</span>
                <span className="world-card-item-time">
                  {eventTimeAgo(e.createdAt)}
                </span>
              </div>
              {eventPreview(e) && (
                <div className="world-card-item-preview">
                  {eventPreview(e)}
                </div>
              )}
            </div>
          ))}
          <button
            className="world-card-dismiss"
            onClick={() => void handleDismiss()}
          >
            知道了
          </button>
        </div>
      )}
    </div>
  );
}