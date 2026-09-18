"use client";

import { useEffect, useState } from "react";

import { formatCountdown } from "@/data/home";
import { getHomeFile } from "@/lib/homeFiles";

type Props = {
  title: string;
  targetDate: string;
  backgroundImageId?: string;
  leftAvatarId?: string;
  centerAvatarId?: string;
  rightAvatarId?: string;
};

/* 从 IndexedDB 加载一张图的 objectURL */
function useHomeImage(imageId: string | undefined) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imageId) {
      setUrl(null);
      return;
    }

    let cancelled = false;
    let created: string | null = null;

    async function load() {
      try {
        const blob = await getHomeFile(imageId!);
        if (!blob) return;
        const u = URL.createObjectURL(blob);
        created = u;
        if (cancelled) {
          URL.revokeObjectURL(u);
          return;
        }
        setUrl(u);
      } catch (e) {
        console.error(
          "[CountdownWidget] 加载图片失败:",
          e
        );
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [imageId]);

  return url;
}

export default function CountdownWidget({
  title,
  targetDate,
  backgroundImageId,
  leftAvatarId,
  centerAvatarId,
  rightAvatarId,
}: Props) {
  const [, force] = useState(0);

  useEffect(() => {
    const t = window.setInterval(
      () => force((v) => v + 1),
      60 * 60 * 1000
    );
    return () => window.clearInterval(t);
  }, []);

  const bgUrl = useHomeImage(backgroundImageId);
  const leftUrl = useHomeImage(leftAvatarId);
  const centerUrl = useHomeImage(centerAvatarId);
  const rightUrl = useHomeImage(rightAvatarId);

  /* ★ 防御：targetDate 可能是 undefined（历史脏数据） */
  const safeTargetDate =
    typeof targetDate === "string" && targetDate
      ? targetDate
      : "";

  const { days, label } = formatCountdown(safeTargetDate);
  const isToday = label === "Today";
  const isPast = label === "days ago";
  const hasDate = safeTargetDate !== "";

  const hasAnyAvatar = !!(
    leftAvatarId ||
    centerAvatarId ||
    rightAvatarId
  );

  return (
    <div
      className="anniv-widget"
      style={
        bgUrl
          ? { backgroundImage: `url("${bgUrl}")` }
          : undefined
      }
    >
      {bgUrl && <div className="anniv-widget-veil" />}

      <div className="anniv-widget-title glass">
        {title || "纪念日"}
      </div>

      {hasAnyAvatar && (
        <div className="anniv-widget-avatars">
          <div className="anniv-widget-avatar is-left">
            {leftUrl ? (
              <img src={leftUrl} alt="" />
            ) : (
              <span>·</span>
            )}
          </div>
          <div className="anniv-widget-avatar is-center">
            {centerUrl ? (
              <img src={centerUrl} alt="" />
            ) : (
              <span>·</span>
            )}
          </div>
          <div className="anniv-widget-avatar is-right">
            {rightUrl ? (
              <img src={rightUrl} alt="" />
            ) : (
              <span>·</span>
            )}
          </div>
        </div>
      )}

      <div className="anniv-widget-footer glass">
        {hasDate ? (
          <>
            <div className="anniv-widget-days">
              <span
                className={`anniv-widget-number${
                  isToday ? " is-today" : ""
                }${isPast ? " is-past" : ""}`}
              >
                {days}
              </span>
              <span className="anniv-widget-label">
                {isToday ? "Today" : label}
              </span>
            </div>
            <div className="anniv-widget-date">
              {safeTargetDate}
            </div>
          </>
        ) : (
          <div className="anniv-widget-days">
            <span className="anniv-widget-label">
              未设置日期
            </span>
          </div>
        )}
      </div>
    </div>
  );
}