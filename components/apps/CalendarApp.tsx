"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Heart,
  Pencil,
  Plus,
  Settings,
  X,
} from "lucide-react";

import {
  buildMonthGrid,
  buildWeekGrid,
  createAnniversaryId,
  dateStrFromDate,
  daysUntil,
  formatAnniversaryDate,
  formatDate,
  getMonthName,
  getWeekdayShort,
  getWeekdayNames,
  hasAnniversary,
  nextOccurrence,
  toDateStr,
  type Anniversary,
  type AnniversaryRepeat,
} from "@/data/calendar";

import {
  loadAnniversaries,
  saveAnniversaries,
} from "@/lib/calendarStorage";

import {
  pickSystemCard,
  type SystemCardCategory,
} from "@/data/calendarSystemCards";

import {
  pickScheduleCard,
  type ScheduleCard,
} from "@/data/calendarScheduleCards";

import {
  loadDailyNotes,
  saveDailyNotes,
  loadDailySchedules,
  saveDailySchedules,
  loadUserSchedules,
  saveUserSchedules,
  loadScheduleCards,
  saveScheduleCards,
  type DailyNote,
  type DailySchedule,
} from "@/lib/calendarSystemStorage";

import SchedulePoolEditor from "@/components/apps/calendar/SchedulePoolEditor";
import { useCollection } from "@/lib/CollectionContext";
import {
  useCharacterAvatars,
  toAvatarKey,
} from "@/lib/useCharacterAvatars";

import {
  loadPeriodRecords,
  loadPeriodSettings,
  migrateLegacyPeriodsIfNeeded,
} from "@/lib/periodStorage";
import {
  daysUntilNext,
  getAverageCycle,
  getActualDay,
  getPredictedPeriods,
} from "@/lib/periodCalc";
import type {
  PeriodRecord as NewPeriodRecord,
  PeriodSettings,
} from "@/data/period";
import { todayStr } from "@/data/period";
import PeriodDetailSheet from "@/components/apps/calendar/PeriodDetailSheet";

type CalendarAppProps = {
  onBack: () => void;
};

type Tab = "calendar" | "anniversary";
type ViewMode = "month" | "week";

/* =========================================================
   系统备注条件
   ========================================================= */

function classifyPeriod(
  dateStr: string,
  records: NewPeriodRecord[],
  settings: PeriodSettings
): SystemCardCategory | null {
  if (records.length === 0) return null;

  const actual = getActualDay(dateStr, records);
  if (actual) return "period-active";

  const yesterday = new Date(dateStr + "T00:00:00");
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = dateStrFromDate(yesterday);

  const endedYesterday = records.some(
    (r) => r.endDate === yStr
  );
  if (endedYesterday) return "period-ended";

  const predicted = getPredictedPeriods(
    records,
    settings,
    1
  );
  if (predicted.length > 0) {
    const next = predicted[0].startDate;
    const diff = Math.round(
      (new Date(next + "T00:00:00").getTime() -
        new Date(dateStr + "T00:00:00").getTime()) /
        (24 * 60 * 60 * 1000)
    );
    if (diff >= 0 && diff <= 3) {
      return "period-upcoming";
    }
  }

  return null;
}

function pickCategory(
  dateStr: string,
  records: NewPeriodRecord[],
  settings: PeriodSettings
): SystemCardCategory {
  const periodCat = classifyPeriod(
    dateStr,
    records,
    settings
  );
  if (periodCat) return periodCat;

  const d = new Date(dateStr + "T00:00:00");
  const wd = d.getDay();
  if (wd === 1) return "monday";
  if (wd === 0 || wd === 6) return "weekend";
  return "daily";
}

/* =========================================================
   主组件
   ========================================================= */

export default function CalendarApp({
  onBack,
}: CalendarAppProps) {
  const { tryAutoCollect } = useCollection();
  const avatars = useCharacterAvatars();

  const today = new Date();

  const [tab, setTab] = useState<Tab>("calendar");
  const [view, setView] = useState<ViewMode>("month");
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<
    number | null
  >(today.getDate());

  const [anniversaries, setAnniversaries] = useState<
    Anniversary[]
  >([]);
  const [dailyNotes, setDailyNotes] = useState<
    Record<string, DailyNote>
  >({});
  const [dailySchedules, setDailySchedules] = useState<
    Record<string, DailySchedule>
  >({});
  const [userSchedules, setUserSchedules] = useState<
    Record<string, string>
  >({});
  const [scheduleCards, setScheduleCards] = useState<
    ScheduleCard[]
  >([]);

  const [editingUserSchedule, setEditingUserSchedule] =
    useState(false);
  const [userScheduleDraft, setUserScheduleDraft] =
    useState("");

  const [showAnnForm, setShowAnnForm] = useState(false);
  const [editingAnn, setEditingAnn] =
    useState<Anniversary | null>(null);
  const [annForm, setAnnForm] = useState({
    title: "",
    repeat: "yearly" as AnniversaryRepeat,
    year: "",
    month: today.getMonth() + 1,
    day: today.getDate(),
  });



  const [showPoolEditor, setShowPoolEditor] =
    useState(false);

      /* 新经期系统 */
  const [newPeriodRecords, setNewPeriodRecords] =
    useState<NewPeriodRecord[]>([]);
  const [newPeriodSettings, setNewPeriodSettings] =
    useState<PeriodSettings>({ cycleLength: 28 });

      /* 经期详情面板：打开时存 dateStr */
  const [periodDetailDate, setPeriodDetailDate] =
    useState<string | null>(null);

  useEffect(() => {
    setAnniversaries(loadAnniversaries());

    /* 新经期系统：先迁移旧数据，再加载 */
    migrateLegacyPeriodsIfNeeded();
    const loadedNewRecords = loadPeriodRecords();
    const loadedNewSettings = loadPeriodSettings();
    setNewPeriodRecords(loadedNewRecords);
    setNewPeriodSettings(loadedNewSettings);

    const notes = loadDailyNotes();
    setDailyNotes(notes);

    const schedules = loadDailySchedules();
    setDailySchedules(schedules);

    setUserSchedules(loadUserSchedules());
    setScheduleCards(loadScheduleCards());

    const todayStr = dateStrFromDate(new Date());

    if (!notes[todayStr]) {
      const category = pickCategory(
        todayStr,
        loadedNewRecords,
        loadedNewSettings
      );
      const card = pickSystemCard(category);

      if (card) {
        const nextNotes = {
          ...notes,
          [todayStr]: {
            dateStr: todayStr,
            character: card.character,
            category: card.category,
            text: card.text,
          },
        };
        setDailyNotes(nextNotes);
        saveDailyNotes(nextNotes);
      }
    }

    if (!schedules[todayStr]) {
      const cardsList = loadScheduleCards();
      const levi = pickScheduleCard(cardsList, "Levi");
      const erwin = pickScheduleCard(
        cardsList,
        "Erwin"
      );

      const entry: DailySchedule = {
        dateStr: todayStr,
        levi: levi ? levi.text : null,
        erwin: erwin ? erwin.text : null,
      };

      const next = { ...schedules, [todayStr]: entry };
      setDailySchedules(next);
      saveDailySchedules(next);
    }

  }, []);

  const selectedDateStr = useMemo(() => {
    if (selectedDay === null) return null;
    return toDateStr(year, month, selectedDay);
  }, [year, month, selectedDay]);

  useEffect(() => {
    if (!selectedDateStr) return;
    setUserScheduleDraft(
      userSchedules[selectedDateStr] ?? ""
    );
    setEditingUserSchedule(false);
  }, [selectedDateStr, userSchedules]);

  const monthGrid = useMemo(
    () => buildMonthGrid(year, month),
    [year, month]
  );

  const weekGrid = useMemo(() => {
    if (selectedDay === null) {
      return buildWeekGrid(
        year,
        month,
        today.getDate()
      );
    }
    return buildWeekGrid(year, month, selectedDay);
  }, [year, month, selectedDay, today]);

  const weekdays = useMemo(() => getWeekdayNames(), []);

  const selectedPeriodInfo = useMemo(() => {
    if (!selectedDateStr) return null;
    return getActualDay(
      selectedDateStr,
      newPeriodRecords
    );
  }, [selectedDateStr, newPeriodRecords]);

  const selectedAnniversaries = useMemo(() => {
    if (selectedDay === null) return [];
    return anniversaries.filter((a) => {
      if (a.repeat === "yearly") {
        if (a.month !== month || a.day !== selectedDay)
          return false;
        if (a.year === null) return true;
        return a.year === year;
      }
      return a.day === selectedDay;
    });
  }, [anniversaries, year, month, selectedDay]);

  const selectedNote = selectedDateStr
    ? dailyNotes[selectedDateStr]
    : null;

  const selectedSchedule = selectedDateStr
    ? dailySchedules[selectedDateStr]
    : null;

  const sortedAnniversaries = useMemo(() => {
    return [...anniversaries]
      .map((a) => ({ a, next: nextOccurrence(a) }))
      .sort(
        (x, y) =>
          x.next.getTime() - y.next.getTime()
      );
  }, [anniversaries]);

    /* 新经期系统的派生数据 */
  const daysToNextPeriod = useMemo(
    () =>
      daysUntilNext(
        newPeriodRecords,
        newPeriodSettings
      ),
    [newPeriodRecords, newPeriodSettings]
  );

  const avgCycle = useMemo(
    () => getAverageCycle(newPeriodRecords),
    [newPeriodRecords]
  );

  const predictedDates = useMemo(() => {
    const list = getPredictedPeriods(
      newPeriodRecords,
      newPeriodSettings,
      12
    );
    return new Set(list.map((p) => p.startDate));
  }, [newPeriodRecords, newPeriodSettings]);

  /* ---------- 导航 ---------- */

  function prevMonth() {
    if (view === "week") {
      const base =
        selectedDay ?? today.getDate();
      const d = new Date(year, month - 1, base);
      d.setDate(d.getDate() - 7);
      setYear(d.getFullYear());
      setMonth(d.getMonth() + 1);
      setSelectedDay(d.getDate());
      return;
    }

    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
    setSelectedDay(null);
  }

  function nextMonth() {
    if (view === "week") {
      const base =
        selectedDay ?? today.getDate();
      const d = new Date(year, month - 1, base);
      d.setDate(d.getDate() + 7);
      setYear(d.getFullYear());
      setMonth(d.getMonth() + 1);
      setSelectedDay(d.getDate());
      return;
    }

    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
    setSelectedDay(null);
  }

  function goToday() {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
    setSelectedDay(now.getDate());
  }

  function switchView(v: ViewMode) {
    setView(v);
  }

  /* ---------- 用户行程 ---------- */

  function saveUserSchedule() {
    if (!selectedDateStr) return;
    const text = userScheduleDraft.trim();
    const prevText = userSchedules[selectedDateStr] ?? "";

    const next = { ...userSchedules };
    if (text) next[selectedDateStr] = text;
    else delete next[selectedDateStr];

    setUserSchedules(next);
    saveUserSchedules(next);
    setEditingUserSchedule(false);

    if (!prevText && text) {
      tryAutoCollect({
        source: "schedule",
        content: `行程（${selectedDateStr}）：${text}`,
        sender: "You",
        originalAt: Date.now(),
        meta: { dateStr: selectedDateStr },
      });
    }
  }

  function deleteDailyNote() {
    if (!selectedDateStr) return;
    if (!window.confirm("删除今天的系统备注？")) return;

    const next = { ...dailyNotes };
    delete next[selectedDateStr];
    setDailyNotes(next);
    saveDailyNotes(next);
  }

  /* ---------- 纪念日 CRUD ---------- */

  function openNewAnn() {
    setEditingAnn(null);
    setAnnForm({
      title: "",
      repeat: "yearly",
      year: "",
      month,
      day: selectedDay ?? today.getDate(),
    });
    setShowAnnForm(true);
  }

  function openEditAnn(a: Anniversary) {
    setEditingAnn(a);
    setAnnForm({
      title: a.title,
      repeat: a.repeat,
      year: a.year === null ? "" : String(a.year),
      month: a.month,
      day: a.day,
    });
    setShowAnnForm(true);
  }

  function closeAnnForm() {
    setShowAnnForm(false);
    setEditingAnn(null);
  }

  function saveAnnForm() {
    const title = annForm.title.trim();
    if (!title) return;

    const parsedYear = annForm.year
      ? parseInt(annForm.year, 10)
      : NaN;
    const finalYear =
      annForm.repeat === "yearly" &&
      !Number.isNaN(parsedYear)
        ? parsedYear
        : null;

    if (editingAnn) {
      const next = anniversaries.map((a) =>
        a.id === editingAnn.id
          ? {
              ...a,
              title,
              repeat: annForm.repeat,
              year: finalYear,
              month: annForm.month,
              day: annForm.day,
            }
          : a
      );
      setAnniversaries(next);
      saveAnniversaries(next);
    } else {
      const created: Anniversary = {
        id: createAnniversaryId(),
        title,
        repeat: annForm.repeat,
        year: finalYear,
        month: annForm.month,
        day: annForm.day,
        createdAt: Date.now(),
      };

      const next: Anniversary[] = [
        ...anniversaries,
        created,
      ];
      setAnniversaries(next);
      saveAnniversaries(next);

      tryAutoCollect({
        source: "anniversary",
        sourceId: created.id,
        content: `纪念日「${title}」`,
        sender: "You",
        originalAt: created.createdAt,
      });
    }

    closeAnnForm();
  }

  function deleteAnn(id: string) {
    if (!window.confirm("删除这个纪念日？")) return;
    const next = anniversaries.filter((a) => a.id !== id);
    setAnniversaries(next);
    saveAnniversaries(next);
  }



  /* ---------- 渲染辅助 ---------- */

  const isCurrentMonthToday =
    year === today.getFullYear() &&
    month === today.getMonth() + 1;

  function hasAnnivOn(y: number, m: number, d: number) {
    return hasAnniversary(anniversaries, y, m, d);
  }

  function isInPeriod(dateStr: string) {
    return (
      getActualDay(dateStr, newPeriodRecords) !== null
    );
  }

  function hasNote(dateStr: string) {
    return !!dailyNotes[dateStr];
  }

  function hasSchedule(dateStr: string) {
    const s = dailySchedules[dateStr];
    return !!(s && (s.levi || s.erwin));
  }

  /* ---------- 月视图格子 ---------- */

    function renderMonthCell(
    cell: (typeof monthGrid)[number]
  ) {
    const isSelected =
      cell.isCurrentMonth &&
      cell.month === month &&
      cell.year === year &&
      cell.day === selectedDay;

    const hasAnn = hasAnnivOn(
      cell.year,
      cell.month,
      cell.day
    );

    const inPeriod = isInPeriod(cell.dateStr);
    const isPredicted = predictedDates.has(
      cell.dateStr
    );

    return (
      <button
        key={
          cell.dateStr + String(cell.isCurrentMonth)
        }
        className={`calendar-day${
          cell.isCurrentMonth
            ? ""
            : " calendar-day-other"
        }${cell.isToday ? " calendar-day-today" : ""}${
          isSelected ? " calendar-day-selected" : ""
        }${inPeriod ? " calendar-day-period" : ""}${
          isPredicted ? " calendar-day-predicted" : ""
        }`}
        onClick={() => {
          setYear(cell.year);
          setMonth(cell.month);
          setSelectedDay(cell.day);
        }}
      >
        <span className="calendar-day-num">
          {cell.day}
        </span>
        {hasAnn && (
          <span className="calendar-day-dot" />
        )}
        {isPredicted && !inPeriod && (
          <span className="calendar-day-predicted-dot" />
        )}
      </button>
    );
  }

  /* ---------- 周视图格子 ---------- */

  function renderWeekCell(
    cell: (typeof weekGrid)[number]
  ) {
    const wd = new Date(
      cell.year,
      cell.month - 1,
      cell.day
    ).getDay();

    const isSelected =
      cell.year === year &&
      cell.month === month &&
      cell.day === selectedDay;

    const hasAnn = hasAnnivOn(
      cell.year,
      cell.month,
      cell.day
    );
    const inPeriod = isInPeriod(cell.dateStr);
    const note = hasNote(cell.dateStr);
    const schedule = hasSchedule(cell.dateStr);

    return (
      <button
        key={cell.dateStr}
        className={`calendar-week-cell${
          cell.isToday ? " is-today" : ""
        }${isSelected ? " is-selected" : ""}`}
        onClick={() => {
          setYear(cell.year);
          setMonth(cell.month);
          setSelectedDay(cell.day);
        }}
      >
        <span className="calendar-week-cell-weekday">
          {getWeekdayShort(wd)}
        </span>

        <span
          className={`calendar-week-cell-num${
            inPeriod ? " is-period" : ""
          }`}
        >
          {cell.day}
        </span>

        <span className="calendar-week-cell-dots">
          {hasAnn && (
            <span className="calendar-week-dot calendar-week-dot-anniv" />
          )}
          {note && (
            <span className="calendar-week-dot calendar-week-dot-note" />
          )}
          {schedule && (
            <span className="calendar-week-dot calendar-week-dot-schedule" />
          )}
        </span>
      </button>
    );
  }

  /* ---------- 渲染 ---------- */

  return (
    <main className="app-screen calendar-app">
      <header className="calendar-header">
        <button
          className="calendar-back"
          onClick={onBack}
          aria-label="返回"
        >
          <ChevronLeft size={26} strokeWidth={2.4} />
        </button>

        <div className="calendar-header-center">
          {tab === "calendar" ? (
            <>
              <div className="calendar-header-month">
                {getMonthName(month)}
              </div>
              <div className="calendar-header-year">
                {year}
              </div>
            </>
          ) : (
            <>
              <div className="calendar-header-month">
                Anniversaries
              </div>
              <div className="calendar-header-year">
                {anniversaries.length}
              </div>
            </>
          )}
        </div>

        {tab === "calendar" ? (
          <button
            className="calendar-icon-btn"
            onClick={() => setShowPoolEditor(true)}
            aria-label="行程卡池"
          >
            <Settings size={18} strokeWidth={2} />
          </button>
        ) : (
          <button
            className="calendar-icon-btn"
            onClick={openNewAnn}
            aria-label="添加纪念日"
          >
            <Plus size={20} strokeWidth={2.4} />
          </button>
        )}
      </header>

      {/* ============== Calendar Tab ============== */}
      {tab === "calendar" && (
        <div className="calendar-scroll">
                    {/* 经期状态条（点击打开面板） */}
          {daysToNextPeriod !== null && (
            <button
              type="button"
              className="calendar-period-banner"
              onClick={() =>
                setPeriodDetailDate(todayStr())
              }
            >
              <span className="calendar-period-banner-dot" />
              <span className="calendar-period-banner-text">
                {daysToNextPeriod > 0
                  ? `距离下次经期还有 ${daysToNextPeriod} 天`
                  : daysToNextPeriod === 0
                    ? "今天可能是经期第一天"
                    : `预计经期已过 ${Math.abs(daysToNextPeriod)} 天`}
              </span>
              {avgCycle !== null && (
                <span className="calendar-period-banner-avg">
                  历史平均 {avgCycle} 天
                </span>
              )}
            </button>
          )}

          {/* 无经期数据时也给一个开始入口 */}
          {daysToNextPeriod === null && (
            <button
              type="button"
              className="calendar-period-banner calendar-period-banner-empty"
              onClick={() =>
                setPeriodDetailDate(todayStr())
              }
            >
              <span className="calendar-period-banner-dot calendar-period-banner-dot-empty" />
              <span className="calendar-period-banner-text">
                还没有经期记录 · 点这里开始
              </span>
            </button>
          )}
          <div className="calendar-nav">
            <button
              className="calendar-nav-btn"
              onClick={prevMonth}
              aria-label="上一页"
            >
              <ChevronLeft size={22} strokeWidth={2.4} />
            </button>

            <div className="calendar-view-switch">
              <button
                className={
                  view === "month" ? "active" : ""
                }
                onClick={() => switchView("month")}
              >
                Month
              </button>
              <button
                className={
                  view === "week" ? "active" : ""
                }
                onClick={() => switchView("week")}
              >
                Week
              </button>
            </div>

            <button
              className="calendar-nav-btn"
              onClick={nextMonth}
              aria-label="下一页"
            >
              <ChevronRight size={22} strokeWidth={2.4} />
            </button>
          </div>

          <div className="calendar-today-row">
            <button
              className="calendar-today-btn"
              onClick={goToday}
              disabled={
                isCurrentMonthToday &&
                selectedDay === today.getDate()
              }
            >
              Today
            </button>
          </div>

          {view === "month" && (
            <>
              <div className="calendar-weekdays">
                {weekdays.map((w) => (
                  <div
                    key={w}
                    className="calendar-weekday"
                  >
                    {w}
                  </div>
                ))}
              </div>

              <div className="calendar-grid">
                {monthGrid.map(renderMonthCell)}
              </div>
            </>
          )}

          {view === "week" && (
            <>
              <div className="calendar-week-strip">
                {weekGrid.map(renderWeekCell)}
              </div>

              <div className="calendar-week-month">
                {getMonthName(weekGrid[0].month)} ·{" "}
                {weekGrid[0].day} – {weekGrid[6].day}
              </div>
            </>
          )}

          <section className="calendar-detail">
            <div className="calendar-detail-head">
              <div className="calendar-detail-date">
                {selectedDay !== null
                  ? formatDate(year, month, selectedDay)
                  : "Select a day"}
              </div>
            </div>

            {selectedDay === null ? (
              <div className="calendar-detail-empty">
                点一天看当天的记录
              </div>
            ) : (
              <>
                {selectedNote && (() => {
                  const key = toAvatarKey(
                    selectedNote.character
                  );
                  const url = key ? avatars[key] : null;

                  return (
                    <div className="calendar-note-card">
                      <div className="calendar-note-top">
                        <span
                          className={
                            "calendar-note-avatar" +
                            (url ? " has-image" : "")
                          }
                        >
                          {url ? (
                            <img
                              src={url}
                              alt={selectedNote.character}
                            />
                          ) : selectedNote.character ===
                            "Levi" ? (
                            "L"
                          ) : (
                            "E"
                          )}
                        </span>

                        <div className="calendar-note-body">
                          <div className="calendar-note-name">
                            {selectedNote.character}
                          </div>
                          <div className="calendar-note-text">
                            {selectedNote.text}
                          </div>
                        </div>

                        <button
                          className="calendar-anniv-action danger"
                          onClick={deleteDailyNote}
                          aria-label="删除"
                        >
                          <X size={16} strokeWidth={2.2} />
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {selectedDateStr && (
                  <button
                    className="calendar-add-period-btn"
                    onClick={() =>
                      setPeriodDetailDate(selectedDateStr)
                    }
                  >
                    {selectedPeriodInfo ? (
                      <>
                        <span className="calendar-period-mini-dot" />
                        <span>
                          Day {selectedPeriodInfo.cycleDay}
                          {" · 查看 / 编辑"}
                        </span>
                      </>
                    ) : (
                      <>
                        <Plus
                          size={14}
                          strokeWidth={2.6}
                        />
                        <span>记录经期</span>
                      </>
                    )}
                  </button>
                )}

                <div className="calendar-schedule-block">
                  <div className="calendar-schedule-head">
                    <span className="calendar-schedule-label">
                      My Schedule
                    </span>

                    {!editingUserSchedule && (
                      <button
                        className="calendar-schedule-edit"
                        onClick={() => {
                          setEditingUserSchedule(true);
                          setUserScheduleDraft(
                            userSchedules[
                              selectedDateStr!
                            ] ?? ""
                          );
                        }}
                      >
                        {userSchedules[selectedDateStr!]
                          ? "编辑"
                          : "添加"}
                      </button>
                    )}
                  </div>

                  {editingUserSchedule ? (
                    <div className="calendar-user-schedule-edit">
                      <textarea
                        value={userScheduleDraft}
                        onChange={(e) =>
                          setUserScheduleDraft(
                            e.target.value
                          )
                        }
                        placeholder="今天的计划…"
                        maxLength={200}
                        rows={3}
                        autoFocus
                      />
                      <div className="calendar-user-schedule-actions">
                        <button
                          className="calendar-btn ghost"
                          onClick={() => {
                            setEditingUserSchedule(false);
                            setUserScheduleDraft(
                              userSchedules[
                                selectedDateStr!
                              ] ?? ""
                            );
                          }}
                        >
                          取消
                        </button>
                        <button
                          className="calendar-btn"
                          onClick={saveUserSchedule}
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  ) : userSchedules[selectedDateStr!] ? (
                    <div className="calendar-user-schedule-text">
                      {userSchedules[selectedDateStr!]}
                    </div>
                  ) : (
                    <div className="calendar-detail-empty">
                      还没有行程
                    </div>
                  )}
                </div>

                {selectedSchedule &&
                  (selectedSchedule.levi ||
                    selectedSchedule.erwin) && (
                    <div className="calendar-schedule-block">
                      <div className="calendar-schedule-head">
                        <span className="calendar-schedule-label">
                          Their Day
                        </span>
                      </div>

                      {selectedSchedule.levi && (
                        <div className="calendar-schedule-row">
                          <span
                            className={
                              "calendar-note-avatar" +
                              (avatars.levi
                                ? " has-image"
                                : "")
                            }
                          >
                            {avatars.levi ? (
                              <img
                                src={avatars.levi}
                                alt="Levi"
                              />
                            ) : (
                              "L"
                            )}
                          </span>
                          <div className="calendar-schedule-info">
                            <div className="calendar-schedule-name">
                              Levi
                            </div>
                            <div className="calendar-schedule-text">
                              {selectedSchedule.levi}
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedSchedule.erwin && (
                        <div className="calendar-schedule-row">
                          <span
                            className={
                              "calendar-note-avatar" +
                              (avatars.erwin
                                ? " has-image"
                                : "")
                            }
                          >
                            {avatars.erwin ? (
                              <img
                                src={avatars.erwin}
                                alt="Erwin"
                              />
                            ) : (
                              "E"
                            )}
                          </span>
                          <div className="calendar-schedule-info">
                            <div className="calendar-schedule-name">
                              Erwin
                            </div>
                            <div className="calendar-schedule-text">
                              {selectedSchedule.erwin}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                {selectedAnniversaries.length > 0 && (
                  <div className="calendar-anniv-hint">
                    ♡ 这一天有{" "}
                    {selectedAnniversaries.length} 个纪念日
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}

      {/* ============== Anniversary Tab ============== */}
      {tab === "anniversary" && (
        <div className="calendar-scroll">
          {sortedAnniversaries.length === 0 ? (
            <div className="calendar-anniv-empty">
              <div className="calendar-anniv-empty-icon">
                <Heart size={40} strokeWidth={1.4} />
              </div>
              <div className="calendar-anniv-empty-title">
                还没有纪念日
              </div>
              <div className="calendar-anniv-empty-desc">
                点击右上角 ＋ 添加第一个纪念日
              </div>
            </div>
          ) : (
            <ul className="calendar-anniv-list">
              {sortedAnniversaries.map(({ a, next }) => {
                const days = daysUntil(next);

                return (
                  <li
                    key={a.id}
                    className="calendar-anniv-item"
                  >
                    <span className="calendar-anniv-heart">
                      ♡
                    </span>

                    <div className="calendar-anniv-info">
                      <div className="calendar-anniv-title">
                        {a.title}
                      </div>

                      <div className="calendar-anniv-meta">
                        {formatAnniversaryDate(a)}
                      </div>

                      <div
                        className={`calendar-anniv-days${
                          days === 0
                            ? " is-today"
                            : days < 0
                              ? " is-past"
                              : ""
                        }`}
                      >
                        {days === 0
                          ? "Today"
                          : days < 0
                            ? `${Math.abs(days)} 天前`
                            : `${days} 天后`}
                      </div>
                    </div>

                    <button
                      className="calendar-anniv-action"
                      onClick={() => openEditAnn(a)}
                      aria-label="编辑"
                    >
                      <Pencil size={16} strokeWidth={2} />
                    </button>

                    <button
                      className="calendar-anniv-action danger"
                      onClick={() => deleteAnn(a.id)}
                      aria-label="删除"
                    >
                      <X size={16} strokeWidth={2.2} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <nav className="calendar-dock">
        <div className="calendar-dock-inner">
          <button
            className={`calendar-dock-tab${
              tab === "calendar" ? " active" : ""
            }`}
            onClick={() => setTab("calendar")}
          >
            <CalendarIcon size={22} strokeWidth={1.8} />
            <span>Calendar</span>
          </button>

          <button
            className={`calendar-dock-tab${
              tab === "anniversary" ? " active" : ""
            }`}
            onClick={() => setTab("anniversary")}
          >
            <Heart size={22} strokeWidth={1.8} />
            <span>Anniversary</span>
          </button>
        </div>
      </nav>

      {showAnnForm && (
        <div
          className="calendar-modal-backdrop"
          onClick={closeAnnForm}
        >
          <div
            className="calendar-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="calendar-modal-header">
              <h2>
                {editingAnn ? "编辑纪念日" : "添加纪念日"}
              </h2>
              <button
                className="calendar-modal-close"
                onClick={closeAnnForm}
                aria-label="关闭"
              >
                <X size={16} strokeWidth={2.4} />
              </button>
            </div>

            <label className="calendar-field">
              <span>名称</span>
              <input
                type="text"
                value={annForm.title}
                onChange={(e) =>
                  setAnnForm((f) => ({
                    ...f,
                    title: e.target.value,
                  }))
                }
                placeholder="例如 Yui Birthday"
                maxLength={40}
                autoFocus
              />
            </label>

            <div className="calendar-field">
              <span>提醒方式</span>
              <div className="calendar-segment">
                <button
                  className={
                    annForm.repeat === "yearly"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setAnnForm((f) => ({
                      ...f,
                      repeat: "yearly",
                    }))
                  }
                >
                  每年提醒
                </button>
                <button
                  className={
                    annForm.repeat === "monthly"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setAnnForm((f) => ({
                      ...f,
                      repeat: "monthly",
                    }))
                  }
                >
                  每月提醒
                </button>
              </div>
            </div>

            {annForm.repeat === "yearly" && (
              <>
                <label className="calendar-field">
                  <span>年份（留空 = 每年都提醒）</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={annForm.year}
                    onChange={(e) =>
                      setAnnForm((f) => ({
                        ...f,
                        year: e.target.value.replace(
                          /[^0-9]/g,
                          ""
                        ),
                      }))
                    }
                    placeholder="留空"
                    maxLength={4}
                  />
                </label>

                <label className="calendar-field">
                  <span>月</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={String(annForm.month)}
                    onChange={(e) => {
                      const v = parseInt(
                        e.target.value.replace(
                          /[^0-9]/g,
                          ""
                        ),
                        10
                      );
                      setAnnForm((f) => ({
                        ...f,
                        month: Number.isNaN(v)
                          ? 1
                          : Math.min(12, Math.max(1, v)),
                      }));
                    }}
                    maxLength={2}
                  />
                </label>
              </>
            )}

            <label className="calendar-field">
              <span>
                {annForm.repeat === "monthly"
                  ? "每月的第几天"
                  : "日"}
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={String(annForm.day)}
                onChange={(e) => {
                  const v = parseInt(
                    e.target.value.replace(/[^0-9]/g, ""),
                    10
                  );
                  setAnnForm((f) => ({
                    ...f,
                    day: Number.isNaN(v)
                      ? 1
                      : Math.min(31, Math.max(1, v)),
                  }));
                }}
                maxLength={2}
              />
            </label>

            <div className="calendar-modal-footer">
              <button
                className="calendar-btn ghost"
                onClick={closeAnnForm}
              >
                取消
              </button>

              <button
                className="calendar-btn"
                onClick={saveAnnForm}
                disabled={!annForm.title.trim()}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}


      {showPoolEditor && (
        <SchedulePoolEditor
          cards={scheduleCards}
          onChange={(next) => {
            setScheduleCards(next);
            saveScheduleCards(next);
          }}
          onClose={() => setShowPoolEditor(false)}
        />
      )}

      {periodDetailDate && (
        <PeriodDetailSheet
          dateStr={periodDetailDate}
          onClose={() => setPeriodDetailDate(null)}
          onSaved={() => {
            /* 重新加载新系统数据，让顶部状态条刷新 */
            setNewPeriodRecords(loadPeriodRecords());
          }}
        />
      )}
    </main>
  );
}