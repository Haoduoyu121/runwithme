"use client";

import { useEffect, useState } from "react";

import { loadLetters } from "@/lib/letterStorage";

export default function LetterWidget() {
  const [unread, setUnread] = useState(0);
  const [lastSender, setLastSender] = useState<
    "Levi" | "Erwin" | null
  >(null);

  useEffect(() => {
    function refresh() {
      const list = loadLetters();
      const unreadList = list.filter(
        (l) => l.from !== "You" && !l.read
      );
      setUnread(unreadList.length);

      const sorted = [...list]
        .filter((l) => l.from !== "You")
        .sort((a, b) => b.createdAt - a.createdAt);
      const last = sorted[0];
      setLastSender(
        last && (last.from === "Levi" || last.from === "Erwin")
          ? last.from
          : null
      );
    }

    refresh();

    const timer = window.setInterval(refresh, 20000);
    window.addEventListener("runwithme:letters-updated", refresh);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener(
        "runwithme:letters-updated",
        refresh
      );
    };
  }, []);

  const hasUnread = unread > 0 && lastSender;

  return (
    <div className="letter-widget-v2">
      {/* 信封主体 */}
      <div className="letter-widget-v2-envelope">
        {/* 翻盖 */}
        <div className="letter-widget-v2-flap" />

        {/* 右下角：来信人 */}
        <div className="letter-widget-v2-from">
          {hasUnread ? (
            <>
              <span className="letter-widget-v2-dot" />
              <span>{lastSender}</span>
            </>
          ) : (
            <span className="letter-widget-v2-idle">
              暂时没有来信
            </span>
          )}
        </div>
      </div>
    </div>
  );
}