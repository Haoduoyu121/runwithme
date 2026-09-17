"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  DailyStudyRecord,
  Word,
  WordBook,
} from "@/data/study";

import {
  computeStudyStreak,
  loadRecords,
} from "@/lib/studyStorage";

type Props = {
  books: WordBook[];
  words: Word[];
};

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}-${String(d.getDate()).padStart(
    2,
    "0"
  )}`;
}

export default function StatsPanel({ books, words }: Props) {
  const [records, setRecords] = useState<DailyStudyRecord[]>(
    []
  );

  useEffect(() => {
    setRecords(loadRecords());
  }, [words, books]); /* 词变化时刷新 */

  const today = dateStr(new Date());

  const todayRecord = records.find(
    (r) => r.dateStr === today
  );

  const todayStudied = todayRecord?.wordIds.length ?? 0;

  const masteredCount = useMemo(
    () => words.filter((w) => w.mastery === "mastered").length,
    [words]
  );

  const learningCount = useMemo(
    () => words.filter((w) => w.mastery === "learning").length,
    [words]
  );

  const streak = useMemo(
    () => computeStudyStreak(records),
    [records]
  );

  const totalWords = words.length;

  /* 最近 7 天柱状 */
  const weekDays = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const r of records) {
      byDate.set(r.dateStr, r.wordIds.length);
    }

    const days: {
      dateStr: string;
      label: string;
      count: number;
    }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dateStr(d);
      const label = ["日", "一", "二", "三", "四", "五", "六"][
        d.getDay()
      ];
      days.push({
        dateStr: key,
        label,
        count: byDate.get(key) ?? 0,
      });
    }
    return days;
  }, [records]);

  const weekMax = Math.max(
    1,
    ...weekDays.map((d) => d.count)
  );

  return (
    <div className="study-scroll">
      {/* 主统计 */}
      <div className="study-stats-grid">
        <div className="study-stat-card">
          <div className="study-stat-value">
            {todayStudied}
          </div>
          <div className="study-stat-label">今日已学</div>
        </div>

        <div className="study-stat-card">
          <div className="study-stat-value">
            {masteredCount}
          </div>
          <div className="study-stat-label">已掌握</div>
        </div>

        <div className="study-stat-card">
          <div className="study-stat-value">
            {streak}
          </div>
          <div className="study-stat-label">连续天数</div>
        </div>

        <div className="study-stat-card">
          <div className="study-stat-value">
            {totalWords}
          </div>
          <div className="study-stat-label">总词汇</div>
        </div>
      </div>

      {/* 今日详情 */}
      <div className="study-stats-section">
        <div className="study-stats-section-label">
          今日
        </div>
        <div className="study-stats-today">
          <div className="study-stats-today-row">
            <span>学习</span>
            <strong>{todayStudied} 个词</strong>
          </div>
          <div className="study-stats-today-row">
            <span>答对</span>
            <strong>
              {todayRecord?.correctCount ?? 0} 次
            </strong>
          </div>
          <div className="study-stats-today-row">
            <span>答错</span>
            <strong>
              {todayRecord?.wrongCount ?? 0} 次
            </strong>
          </div>
        </div>
      </div>

      {/* 最近 7 天 */}
      <div className="study-stats-section">
        <div className="study-stats-section-label">
          最近 7 天
        </div>
        <div className="study-stats-chart">
          {weekDays.map((d) => (
            <div key={d.dateStr} className="study-stats-bar-wrap">
              <div className="study-stats-bar-value">
                {d.count > 0 ? d.count : ""}
              </div>
              <div className="study-stats-bar">
                <div
                  className="study-stats-bar-fill"
                  style={{
                    height: `${(d.count / weekMax) * 100}%`,
                  }}
                />
              </div>
              <div className="study-stats-bar-label">
                {d.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 词书进度 */}
      {books.length > 0 && (
        <div className="study-stats-section">
          <div className="study-stats-section-label">
            词书进度
          </div>
          <ul className="study-stats-book-list">
            {books.map((b) => {
              const bw = words.filter(
                (w) => w.bookId === b.id
              );
              const total = bw.length;
              const m = bw.filter(
                (w) => w.mastery === "mastered"
              ).length;
              const l = bw.filter(
                (w) => w.mastery === "learning"
              ).length;

              const pct =
                total > 0 ? (m / total) * 100 : 0;

              return (
                <li
                  key={b.id}
                  className="study-stats-book-item"
                >
                  <div className="study-stats-book-head">
                    <strong>{b.name}</strong>
                    <span>
                      {m} / {total} 已掌握
                    </span>
                  </div>
                  <div className="study-stats-book-bar">
                    <div
                      className="study-stats-book-bar-fill"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="study-stats-book-meta">
                    学习中 {l} 个
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {words.length === 0 && (
        <div className="study-empty">
          <div className="study-empty-icon">▦</div>
          <div className="study-empty-title">
            还没有数据
          </div>
          <div className="study-empty-desc">
            先去 Library 加一些单词
          </div>
        </div>
      )}
    </div>
  );
}