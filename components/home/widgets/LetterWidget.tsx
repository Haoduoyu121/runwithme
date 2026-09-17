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

      /* 最近一封 */
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

    /* 每 20 秒刷新 + 收到广播立即刷新 */
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

  return (
    <div className="home-widget-letter">
      <div className="home-widget-letter-label">
        LETTERS
      </div>

      <div className="home-widget-letter-number">
        {unread}
      </div>

      <div className="home-widget-letter-status">
        {unread === 0
          ? "都读过了"
          : unread === 1
            ? "unread"
            : "unread"}
      </div>

      {unread > 0 && lastSender && (
        <div className="home-widget-letter-from">
          <span
            className={
              "home-widget-letter-dot home-widget-letter-dot-" +
              lastSender.toLowerCase()
            }
          />
          <span>最近一封 · {lastSender}</span>
        </div>
      )}
    </div>
  );
}