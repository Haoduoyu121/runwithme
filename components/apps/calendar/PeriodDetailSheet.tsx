"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Calendar as CalendarIcon,
  History,
  Settings,
  X,
} from "lucide-react";

import {
  FLOW_LABELS,
  MAX_CYCLE_LENGTH,
  MIN_CYCLE_LENGTH,
  SYMPTOM_LABELS,
  SYMPTOM_ORDER,
  addDays,
  createDailyRecord,
  createPeriodId,
  diffDays,
  todayStr,
  type DailyPeriodRecord,
  type PeriodFlow,
  type PeriodRecord,
  type PeriodSettings,
  type PeriodSymptom,
} from "@/data/period";

import {
  clampCycle,
  loadPeriodNoteCards,
  loadPeriodRecords,
  loadPeriodSettings,
  savePeriodRecords,
  savePeriodSettings,
} from "@/lib/periodStorage";

import {
  getActivePeriod,
  getActualDay,
  getAverageCycle,
  getCycleHistory,
  getNextPredictedDate,
  pickRandomNoteCard,
} from "@/lib/periodCalc";

import PeriodNoteCardEditor from "@/components/apps/calendar/PeriodNoteCardEditor";

type Props = {
  dateStr: string;
  onClose: () => void;
  onSaved: () => void;
};

const FLOW_OPTIONS: PeriodFlow[] = [
  "none",
  "light",
  "medium",
  "heavy",
];

function formatShort(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${m}/${d}`;
}

export default function PeriodDetailSheet({
  dateStr,
  onClose,
  onSaved,
}: Props) {
  const [records, setRecords] = useState<PeriodRecord[]>([]);
  const [settings, setSettings] = useState<PeriodSettings>({
    cycleLength: 28,
  });
  const [noteMsg, setNoteMsg] = useState<{
    character: "Levi" | "Erwin";
    text: string;
  } | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
    const [showNoteCardEditor, setShowNoteCardEditor] =
    useState(false);

  useEffect(() => {
    setRecords(loadPeriodRecords());
    setSettings(loadPeriodSettings());
  }, []);

  const actual = useMemo(
    () => getActualDay(dateStr, records),
    [dateStr, records]
  );

  const active = useMemo(
    () => getActivePeriod(records),
    [records]
  );

  const dailyRecord = actual
    ? actual.record.dailyRecords.find(
        (d) => d.date === dateStr
      ) ?? null
    : null;

  const cycleHistory = useMemo(
    () => getCycleHistory(records),
    [records]
  );

  const average = useMemo(
    () => getAverageCycle(records),
    [records]
  );

  const nextPredicted = useMemo(
    () => getNextPredictedDate(records, settings),
    [records, settings]
  );

  /* ---------- 操作 ---------- */

  function handleStart() {
    if (active) {
      window.alert(
        "已有未结束的经期记录。请先结束当前经期。"
      );
      return;
    }

    const newRecord: PeriodRecord = {
      id: createPeriodId(),
      startDate: dateStr,
      endDate: null,
      dailyRecords: [createDailyRecord(dateStr, 1)],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const next = [newRecord, ...records];
    if (!savePeriodRecords(next)) return;

    setRecords(next);

    const cards = loadPeriodNoteCards();
    const card = pickRandomNoteCard(cards);
    if (card) {
      setNoteMsg({
        character: card.character,
        text: card.text,
      });
    }

    onSaved();
  }

  function handleEnd() {
    if (!active) return;
    if (dateStr < active.startDate) {
      window.alert("结束日期不能早于开始日期");
      return;
    }

    const existing = new Map(
      active.dailyRecords.map((d) => [d.date, d])
    );
    const totalDays =
      diffDays(active.startDate, dateStr) + 1;
    const newDaily: DailyPeriodRecord[] = [];
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(active.startDate, i);
      const cur =
        existing.get(d) ??
        createDailyRecord(d, i + 1);
      newDaily.push(cur);
    }

    const next = records.map((r) =>
      r.id === active.id
        ? {
            ...r,
            endDate: dateStr,
            dailyRecords: newDaily,
            updatedAt: Date.now(),
          }
        : r
    );

    if (!savePeriodRecords(next)) return;
    setRecords(next);
    onSaved();
  }

  function handleDeleteRecord(recordId: string) {
    if (
      !window.confirm(
        "删除这一次的经期记录？此操作不可恢复。"
      )
    )
      return;

    const next = records.filter((r) => r.id !== recordId);
    if (!savePeriodRecords(next)) return;
    setRecords(next);
    onSaved();
  }

  function patchDaily(patch: Partial<DailyPeriodRecord>) {
    if (!actual) return;
    const { record, cycleDay } = actual;

    const next = records.map((r) => {
      if (r.id !== record.id) return r;

      const existing = r.dailyRecords.find(
        (d) => d.date === dateStr
      );

      const updated: DailyPeriodRecord = existing
        ? { ...existing, ...patch }
        : {
            ...createDailyRecord(dateStr, cycleDay),
            ...patch,
          };

      const list = r.dailyRecords.filter(
        (d) => d.date !== dateStr
      );
      list.push(updated);
      list.sort((a, b) => (a.date < b.date ? -1 : 1));

      return {
        ...r,
        dailyRecords: list,
        updatedAt: Date.now(),
      };
    });

    if (!savePeriodRecords(next)) return;
    setRecords(next);
    onSaved();
  }

  function toggleSymptom(s: PeriodSymptom) {
    if (!actual) return;
    const cur = dailyRecord;
    const symptoms = cur?.symptoms ?? [];

    let next: PeriodSymptom[];

    if (s === "none") {
      next = symptoms.includes("none") ? [] : ["none"];
    } else {
      const withoutNone = symptoms.filter(
        (x) => x !== "none"
      );
      next = withoutNone.includes(s)
        ? withoutNone.filter((x) => x !== s)
        : [...withoutNone, s];
    }

    patchDaily({ symptoms: next });
  }

  function updateCycleLength(n: number) {
    const next = { ...settings, cycleLength: clampCycle(n) };
    setSettings(next);
    savePeriodSettings(next);
    onSaved();
  }

  /* ---------- 日期文本 ---------- */

  const [y, m, d] = dateStr.split("-").map(Number);
  const dateLabel = `${y} 年 ${m} 月 ${d} 日`;

  const isToday = dateStr === todayStr();
  const isFuture = dateStr > todayStr();

  return (
    <div
      className="period-sheet-backdrop"
      onClick={onClose}
    >
      <div
        className="period-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="period-sheet-handle" />

        <header className="period-sheet-header">
          <div>
            <div className="period-sheet-eyebrow">
              PERIOD
            </div>
            <h2 className="period-sheet-title">
              {dateLabel}
            </h2>
            {isToday && (
              <span className="period-sheet-today">
                今天
              </span>
            )}
          </div>

          <div className="period-sheet-header-actions">
            <button
              className={
                "period-sheet-icon-btn" +
                (showSettings ? " active" : "")
              }
              onClick={() =>
                setShowSettings((v) => !v)
              }
              aria-label="周期设置"
            >
              <Settings size={16} strokeWidth={2} />
            </button>

            <button
              className="period-sheet-close"
              onClick={onClose}
              aria-label="关闭"
            >
              <X size={16} strokeWidth={2.4} />
            </button>
          </div>
        </header>

        <div className="period-sheet-body">
          {/* ---------- 周期设置折叠区 ---------- */}
          {showSettings && (
            <div className="period-settings-block">
              <div className="period-settings-row">
                <div className="period-settings-info">
                  <strong>周期长度</strong>
                  <span>
                    用于计算下次预计经期日
                  </span>
                </div>

                <div className="period-settings-stepper">
                  <button
                    type="button"
                    onClick={() =>
                      updateCycleLength(
                        settings.cycleLength - 1
                      )
                    }
                    disabled={
                      settings.cycleLength <=
                      MIN_CYCLE_LENGTH
                    }
                    aria-label="减少"
                  >
                    −
                  </button>

                  <input
                    type="number"
                    min={MIN_CYCLE_LENGTH}
                    max={MAX_CYCLE_LENGTH}
                    value={settings.cycleLength}
                    onChange={(e) => {
                      const n = parseInt(
                        e.target.value,
                        10
                      );
                      if (Number.isNaN(n)) return;
                      updateCycleLength(n);
                    }}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      updateCycleLength(
                        settings.cycleLength + 1
                      )
                    }
                    disabled={
                      settings.cycleLength >=
                      MAX_CYCLE_LENGTH
                    }
                    aria-label="增加"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="period-settings-summary">
                {average !== null && (
                  <span>
                    历史平均 {average} 天
                  </span>
                )}
                {nextPredicted && (
                  <span>
                    下次预计{" "}
                    {formatShort(nextPredicted)}
                  </span>
                )}
                {average === null &&
                  !nextPredicted && (
                    <span>
                      开始第一次经期后会自动计算
                    </span>
                  )}
              </div>

              <button
                type="button"
                className="period-settings-manage-btn"
                onClick={() =>
                  setShowNoteCardEditor(true)
                }
              >
                管理随机备注卡池
              </button>
            </div>
          )}

          {/* ---------- 随机备注 ---------- */}
          {noteMsg && (
            <div className="period-sheet-note">
              <span
                className={`period-sheet-note-avatar period-sheet-note-avatar-${noteMsg.character.toLowerCase()}`}
              >
                {noteMsg.character.charAt(0)}
              </span>
              <div className="period-sheet-note-content">
                <div className="period-sheet-note-name">
                  {noteMsg.character}
                </div>
                <div className="period-sheet-note-text">
                  {noteMsg.text}
                </div>
              </div>
              <button
                className="period-sheet-note-close"
                onClick={() => setNoteMsg(null)}
                aria-label="关闭备注"
              >
                <X size={12} strokeWidth={2.4} />
              </button>
            </div>
          )}

          {/* ---------- 情况 1：在经期内 → 编辑 ---------- */}
          {actual ? (
            <>
              <div className="period-sheet-day">
                Day {actual.cycleDay}
                <span className="period-sheet-day-status">
                  {actual.record.endDate === null
                    ? "进行中"
                    : "已结束"}
                </span>
              </div>

              <section className="period-sheet-section">
                <div className="period-sheet-label">
                  血量
                </div>
                <div className="period-sheet-flow">
                  {FLOW_OPTIONS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={
                        "period-sheet-flow-btn" +
                        (dailyRecord?.flow === f
                          ? " active"
                          : "")
                      }
                      onClick={() =>
                        patchDaily({ flow: f })
                      }
                    >
                      {FLOW_LABELS[f]}
                    </button>
                  ))}
                </div>
              </section>

              <section className="period-sheet-section">
                <div className="period-sheet-label">
                  不适（可多选）
                </div>
                <div className="period-sheet-symptoms">
                  {SYMPTOM_ORDER.map((s) => {
                    const isActive =
                      dailyRecord?.symptoms.includes(
                        s
                      );
                    return (
                      <button
                        key={s}
                        type="button"
                        className={
                          "period-sheet-symptom" +
                          (isActive ? " active" : "")
                        }
                        onClick={() => toggleSymptom(s)}
                      >
                        {SYMPTOM_LABELS[s]}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="period-sheet-section">
                <div className="period-sheet-label">
                  备注
                </div>
                <textarea
                  className="period-sheet-textarea"
                  value={dailyRecord?.note ?? ""}
                  onChange={(e) =>
                    patchDaily({
                      note: e.target.value,
                    })
                  }
                  placeholder="今天的感觉…"
                  maxLength={200}
                  rows={3}
                />
              </section>

              {actual.record.endDate === null &&
                isToday && (
                  <button
                    className="period-sheet-action period-sheet-action-end"
                    onClick={handleEnd}
                  >
                    结束本次经期
                  </button>
                )}
            </>
          ) : (
            <>
              <div className="period-sheet-empty">
                <CalendarIcon
                  size={32}
                  strokeWidth={1.5}
                />
                <p>这一天还没有经期记录</p>

                {active ? (
                  <span className="period-sheet-empty-hint">
                    当前经期从 {active.startDate} 开始
                    {isFuture
                      ? "（不能为未来日期开始经期）"
                      : ""}
                  </span>
                ) : (
                  <span className="period-sheet-empty-hint">
                    点下方按钮，把这一天标记为经期第一天
                  </span>
                )}
              </div>

              {!active && !isFuture && (
                <button
                  className="period-sheet-action period-sheet-action-start"
                  onClick={handleStart}
                >
                  开始本次经期
                </button>
              )}
            </>
          )}

          {/* ---------- 历史周期 ---------- */}
          {cycleHistory.length > 0 && (
            <div className="period-history-block">
              <button
                type="button"
                className={
                  "period-history-toggle" +
                  (showHistory ? " active" : "")
                }
                onClick={() =>
                  setShowHistory((v) => !v)
                }
              >
                <History size={14} strokeWidth={2} />
                <span>
                  历史周期（{cycleHistory.length}）
                </span>
                <span className="period-history-caret">
                  {showHistory ? "▲" : "▼"}
                </span>
              </button>

              {showHistory && (
                <ul className="period-history-list">
                  {[...cycleHistory]
                    .reverse()
                    .map((h, i) => (
                      <li
                        key={`${h.fromStart}-${h.toStart}`}
                        className="period-history-item"
                      >
                        <span className="period-history-range">
                          {formatShort(h.fromStart)}
                          {" → "}
                          {formatShort(h.toStart)}
                        </span>
                        <span className="period-history-length">
                          {h.length} 天
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}

          {/* ---------- 删除记录（仅在有 actual 时） ---------- */}
          {actual && (
            <button
              className="period-sheet-delete"
              onClick={() =>
                handleDeleteRecord(actual.record.id)
              }
            >
              删除这次记录
            </button>
          )}
        </div>
      </div>

      {showNoteCardEditor && (
        <PeriodNoteCardEditor
          onClose={() => setShowNoteCardEditor(false)}
        />
      )}
    </div>
  );
}