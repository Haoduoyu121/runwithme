"use client";

import { useEffect, useState } from "react";

import {
  loadRecords,
  computeStudyStreak,
} from "@/lib/studyStorage";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}-${String(d.getDate()).padStart(
    2,
    "0"
  )}`;
}

export default function StudyWidget() {
  const [todayCount, setTodayCount] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    function refresh() {
      const records = loadRecords();
      const today = records.find(
        (r) => r.dateStr === todayStr()
      );
      setTodayCount(today?.wordIds.length ?? 0);
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

  return (
    <div className="home-widget-study">
      <div className="home-widget-study-label">
        STUDY
      </div>

      <div className="home-widget-study-number">
        {todayCount}
      </div>

      <div className="home-widget-study-unit">
        words today
      </div>

      <div className="home-widget-study-streak">
        <span className="home-widget-study-fire">✦</span>
        <span>连续 {streak} 天</span>
      </div>
    </div>
  );
}