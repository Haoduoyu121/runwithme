"use client";

import { useEffect, useState } from "react";

import {
  loadRecords,
  computeStudyStreak,
} from "@/lib/studyStorage";
import { getHomeFile } from "@/lib/homeFiles";

type Props = {
  avatarId?: string;
  bubbleText?: string;
};

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}-${String(d.getDate()).padStart(
    2,
    "0"
  )}`;
}

export default function StudyWidget({
  avatarId,
  bubbleText,
}: Props) {
  const [streak, setStreak] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    null
  );

  useEffect(() => {
    function refresh() {
      const records = loadRecords();
      setStreak(computeStudyStreak(records));
    }

    refresh();

    const timer = window.setInterval(refresh, 20000);
    window.addEventListener(
      "runwithme:study-updated",
      refresh
    );

    return () => {
      window.clearInterval(timer);
      window.removeEventListener(
        "runwithme:study-updated",
        refresh
      );
    };
  }, []);

  /* 加载头像 */
  useEffect(() => {
    if (!avatarId) {
      setAvatarUrl(null);
      return;
    }

    let cancelled = false;
    let created: string | null = null;

    async function load() {
      try {
        const blob = await getHomeFile(avatarId!);
        if (!blob) return;
        const u = URL.createObjectURL(blob);
        created = u;
        if (cancelled) {
          URL.revokeObjectURL(u);
          return;
        }
        setAvatarUrl(u);
      } catch (e) {
        console.error("[StudyWidget] 加载头像失败:", e);
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [avatarId]);

  /* 未使用：用于触发 todayStr 引用防止 lint 报错 */
  void todayStr;

  return (
    <div className="study-widget-v2">
      {/* 顶部：连续天数 */}
      <div className="study-widget-v2-streak">
        <div className="study-widget-v2-streak-label">
          你连续学习了
        </div>
        <div className="study-widget-v2-streak-number">
          {streak}
          <span className="study-widget-v2-streak-unit">
            天
          </span>
        </div>
      </div>

      {/* 底部：头像 + 气泡 */}
      <div className="study-widget-v2-bottom">
        <div className="study-widget-v2-avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" />
          ) : (
            <span>Y</span>
          )}
        </div>

        <div className="study-widget-v2-bubble">
          {bubbleText?.trim() || "今天也一起加油吧"}
        </div>
      </div>
    </div>
  );
}