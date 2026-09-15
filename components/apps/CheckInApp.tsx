"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  computeStreak,
  createTaskCommentId,
  createTaskId,
  dateStrFromDate,
  formatDateLabel,
  formatWeekday,
  getCheckinAuthorDisplay,
  pickRandomEnabled,
  recordKey,
  todayStr,
  type CheckinCharacter,
  type CommentCard,
  type DayTaskRecord,
  type Task,
  type TaskCard,
  type TaskComment,
} from "@/data/checkin";

import {
  loadCommentCards,
  loadRecords,
  loadTaskCards,
  loadTasks,
  saveCommentCards,
  saveRecords,
  saveTaskCards,
  saveTasks,
} from "@/lib/checkinStorage";

import { usePomodoro } from "@/lib/PomodoroContext";

import PomodoroPanel from "@/components/apps/checkin/PomodoroPanel";
import PoolEditor from "@/components/apps/checkin/PoolEditor";

type CheckInAppProps = {
  onBack: () => void;
};

type Tab = "today" | "pomodoro" | "history";

/* =========================================================
   图标
   ========================================================= */

function PlusIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v4" />
      <path d="M12 17v4" />
      <path d="M3 12h4" />
      <path d="M17 12h4" />
      <path d="M6 6l2 2" />
      <path d="M16 16l2 2" />
      <path d="M6 18l2-2" />
      <path d="M16 8l2-2" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function TodayIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M8 13l2 2 4-4" />
    </svg>
  );
}

function TimerIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2" />
      <path d="M9 2h6" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

/* =========================================================
   主组件
   ========================================================= */

export default function CheckInApp({
  onBack,
}: CheckInAppProps) {
  const {
    boundTaskId: pomodoroTaskId,
    bindTask,
    onFocusComplete,
    running: pomodoroRunning,
  } = usePomodoro();

  const [tab, setTab] = useState<Tab>("today");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [records, setRecords] = useState<
    Record<string, DayTaskRecord>
  >({});
  const [taskCards, setTaskCards] = useState<TaskCard[]>(
    []
  );
  const [commentCards, setCommentCards] = useState<
    CommentCard[]
  >([]);

  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");

  const [showPoolEditor, setShowPoolEditor] =
    useState(false);

  const [expandedTaskId, setExpandedTaskId] = useState<
    string | null
  >(null);

  const [commentDrafts, setCommentDrafts] = useState<
    Record<string, string>
  >({});

  const today = todayStr();

  const recordsRef = useRef(records);
  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  /* ---------- 初始化 ---------- */

  useEffect(() => {
    setTasks(loadTasks());
    setRecords(loadRecords());
    setTaskCards(loadTaskCards());
    setCommentCards(loadCommentCards());
  }, []);

  /* ---------- 提交 ---------- */

  const commitTasks = useCallback((next: Task[]) => {
    setTasks(next);
    saveTasks(next);
  }, []);

  const commitRecords = useCallback(
    (next: Record<string, DayTaskRecord>) => {
      setRecords(next);
      saveRecords(next);
    },
    []
  );

  const commitTaskCards = useCallback(
    (next: TaskCard[]) => {
      setTaskCards(next);
      saveTaskCards(next);
    },
    []
  );

  const commitCommentCards = useCallback(
    (next: CommentCard[]) => {
      setCommentCards(next);
      saveCommentCards(next);
    },
    []
  );

  /* ---------- 订阅全局番茄钟完成事件 ---------- */

  useEffect(() => {
    const unsubscribe = onFocusComplete((taskId) => {
      if (!taskId) return;

      const ds = todayStr();
      const key = recordKey(ds, taskId);

      const prev = recordsRef.current[key] ?? {
        completed: false,
        pomodoroCount: 0,
        comments: [],
      };

      const next = {
        ...recordsRef.current,
        [key]: {
          ...prev,
          pomodoroCount: prev.pomodoroCount + 1,
        },
      };

      commitRecords(next);
    });

    return unsubscribe;
  }, [onFocusComplete, commitRecords]);

  /* ---------- 记录读取 ---------- */

  function getRecord(
    dateStr: string,
    taskId: string
  ): DayTaskRecord {
    const key = recordKey(dateStr, taskId);
    return (
      records[key] ?? {
        completed: false,
        pomodoroCount: 0,
        comments: [],
      }
    );
  }

  function setRecord(
    dateStr: string,
    taskId: string,
    updater: (prev: DayTaskRecord) => DayTaskRecord
  ) {
    const key = recordKey(dateStr, taskId);
    const prev = records[key] ?? {
      completed: false,
      pomodoroCount: 0,
      comments: [],
    };
    const next = { ...records, [key]: updater(prev) };
    commitRecords(next);
  }

  /* ---------- 任务 ---------- */

  function handleAddTask() {
    const name = newTaskName.trim();
    if (!name) return;

    const task: Task = {
      id: createTaskId(),
      name,
      createdAt: Date.now(),
    };

    commitTasks([...tasks, task]);
    setNewTaskName("");
    setShowAddTask(false);
  }

  function handleAddRandomTask() {
    const card = pickRandomEnabled(taskCards);
    if (!card) {
      alert("任务卡池是空的。");
      return;
    }

    const exists = tasks.some(
      (t) => t.name === card.text
    );
    if (exists) {
      alert("这个任务已经在列表里了。");
      return;
    }

    const task: Task = {
      id: createTaskId(),
      name: card.text,
      createdAt: Date.now(),
    };

    commitTasks([...tasks, task]);
  }

  function handleDeleteTask(id: string) {
    if (!window.confirm("删除这个任务？")) return;

    commitTasks(tasks.filter((t) => t.id !== id));

    const next = { ...records };
    for (const key of Object.keys(next)) {
      if (key.endsWith(`:${id}`)) {
        delete next[key];
      }
    }
    commitRecords(next);

    if (pomodoroTaskId === id) bindTask(null);
    if (expandedTaskId === id) setExpandedTaskId(null);
  }

  /* ---------- 打卡 ---------- */

  function toggleComplete(taskId: string) {
    setRecord(today, taskId, (prev) => {
      const nowCompleted = !prev.completed;

      let comments = prev.comments;

      if (nowCompleted && prev.comments.length === 0) {
        comments = generateCommentsForTask();
      }

      return {
        ...prev,
        completed: nowCompleted,
        completedAt: nowCompleted
          ? Date.now()
          : undefined,
        comments,
      };
    });
  }

  function generateCommentsForTask(): TaskComment[] {
    const result: TaskComment[] = [];

    if (Math.random() > 0.7) return result;

    const pick1 = pickRandomEnabled(commentCards);
    if (!pick1) return result;

    result.push({
      id: createTaskCommentId(),
      author: pick1.character,
      text: pick1.text,
      createdAt: Date.now(),
    });

    if (Math.random() < 0.3) {
      const others = commentCards.filter(
        (c) => c.character !== pick1.character
      );
      const pick2 = pickRandomEnabled(others);
      if (pick2) {
        result.push({
          id: createTaskCommentId(),
          author: pick2.character,
          text: pick2.text,
          createdAt: Date.now() + 1,
        });
      }
    }

    return result;
  }

  /* ---------- 评论 ---------- */

  function submitUserComment(taskId: string) {
    const text = (commentDrafts[taskId] ?? "").trim();
    if (!text) return;

    setRecord(today, taskId, (prev) => ({
      ...prev,
      comments: [
        ...prev.comments,
        {
          id: createTaskCommentId(),
          author: "Yui" as CheckinCharacter,
          text,
          createdAt: Date.now(),
        },
      ],
    }));

    setCommentDrafts((prev) => {
      const copy = { ...prev };
      delete copy[taskId];
      return copy;
    });
  }

  function deleteComment(
    taskId: string,
    commentId: string
  ) {
    setRecord(today, taskId, (prev) => ({
      ...prev,
      comments: prev.comments.filter(
        (c) => c.id !== commentId
      ),
    }));
  }

  /* ---------- 番茄钟绑定 ---------- */

  function startPomodoroForTask(taskId: string) {
    bindTask(taskId);
    setTab("pomodoro");
  }

  /* ---------- 统计 ---------- */

  const streak = useMemo(
    () => computeStreak(records, tasks),
    [records, tasks]
  );

  const todayCompleted = useMemo(() => {
    let count = 0;
    for (const t of tasks) {
      const r = records[recordKey(today, t.id)];
      if (r?.completed) count++;
    }
    return count;
  }, [tasks, records, today]);

  const historyDays = useMemo(() => {
    const result: {
      dateStr: string;
      completed: number;
      total: number;
    }[] = [];

    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = dateStrFromDate(d);

      let completed = 0;
      for (const t of tasks) {
        const r = records[recordKey(ds, t.id)];
        if (r?.completed) completed++;
      }

      result.push({
        dateStr: ds,
        completed,
        total: tasks.length,
      });
    }

    return result;
  }, [records, tasks]);

  const pomodoroTask = pomodoroTaskId
    ? tasks.find((t) => t.id === pomodoroTaskId) ?? null
    : null;

  /* ---------- Render ---------- */

  const headerTitle =
    tab === "today"
      ? "Check-in"
      : tab === "pomodoro"
        ? "Pomodoro"
        : "History";

  const headerSub =
    tab === "today"
      ? `${todayCompleted} / ${tasks.length} · ${streak} day streak`
      : tab === "pomodoro"
        ? pomodoroTask
          ? `${pomodoroTask.name}${
              pomodoroRunning ? " · 计时中" : ""
            }`
          : pomodoroRunning
            ? "计时中…"
            : "专注计时"
        : `${historyDays.length} 天`;

  return (
    <main className="app-screen checkin-app">
      <header className="checkin-header">
        <button
          className="checkin-back"
          onClick={onBack}
          aria-label="返回"
        >
          ‹
        </button>

        <div className="checkin-header-center">
          <div className="checkin-header-title">
            {headerTitle}
          </div>
          <div className="checkin-header-sub">
            {headerSub}
          </div>
        </div>

        {tab === "today" ? (
          <>
            <button
              className="checkin-icon-btn"
              onClick={() => setShowPoolEditor(true)}
              aria-label="卡池"
            >
              <GearIcon />
            </button>

            <button
              className="checkin-add-btn"
              onClick={() => {
                setNewTaskName("");
                setShowAddTask(true);
              }}
              aria-label="添加任务"
            >
              <PlusIcon />
            </button>
          </>
        ) : tab === "pomodoro" ? (
          <>
            <button
              className="checkin-icon-btn"
              onClick={() => setShowPoolEditor(true)}
              aria-label="卡池"
            >
              <GearIcon />
            </button>
            <div className="checkin-header-placeholder" />
          </>
        ) : (
          <div className="checkin-header-placeholder" />
        )}
      </header>

      {/* ============ Today ============ */}
      {tab === "today" && (
        <div className="checkin-scroll">
          <div className="checkin-today-banner">
            <div className="checkin-today-date">
              {formatWeekday(today)} ·{" "}
              {formatDateLabel(today)}
            </div>
            <div className="checkin-today-streak">
              {streak > 0
                ? `🔥 ${streak} day streak`
                : "从今天开始记录"}
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="checkin-empty">
              <div className="checkin-empty-icon">
                ☑
              </div>
              <div className="checkin-empty-title">
                还没有任务
              </div>
              <div className="checkin-empty-desc">
                点右上角 ＋ 添加，或点下面随机一个
              </div>
            </div>
          ) : (
            <ul className="checkin-task-list">
              {tasks.map((task) => {
                const rec = getRecord(today, task.id);
                const expanded =
                  expandedTaskId === task.id;

                return (
                  <li
                    key={task.id}
                    className={`checkin-task${
                      rec.completed
                        ? " is-completed"
                        : ""
                    }`}
                  >
                    <div
                      className="checkin-task-row"
                      onClick={() =>
                        setExpandedTaskId(
                          expanded ? null : task.id
                        )
                      }
                    >
                      <button
                        className="checkin-task-check"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleComplete(task.id);
                        }}
                        aria-label={
                          rec.completed
                            ? "取消完成"
                            : "标记完成"
                        }
                      >
                        {rec.completed ? "✓" : ""}
                      </button>

                      <div className="checkin-task-name">
                        {task.name}
                      </div>

                      {rec.pomodoroCount > 0 && (
                        <div className="checkin-task-pomo">
                          🍅 {rec.pomodoroCount}
                        </div>
                      )}

                      <button
                        className="checkin-task-start"
                        onClick={(e) => {
                          e.stopPropagation();
                          startPomodoroForTask(task.id);
                        }}
                        aria-label="开始番茄钟"
                      >
                        ⏱
                      </button>

                      <button
                        className="checkin-task-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(task.id);
                        }}
                        aria-label="删除任务"
                      >
                        ×
                      </button>
                    </div>

                    {expanded && (
                      <div className="checkin-task-detail">
                        {rec.comments.length === 0 ? (
                          <div className="checkin-task-comments-empty">
                            还没有评论
                          </div>
                        ) : (
                          <div className="checkin-task-comments">
                            {rec.comments.map((c) => {
                              const d =
                                getCheckinAuthorDisplay(
                                  c.author
                                );
                              return (
                                <div
                                  key={c.id}
                                  className="checkin-comment"
                                >
                                  <div
                                    className={`checkin-avatar checkin-avatar-small ${d.colorClass}`}
                                  >
                                    {d.initial}
                                  </div>
                                  <div className="checkin-comment-body">
                                    <div className="checkin-comment-name">
                                      {d.name}
                                    </div>
                                    <div className="checkin-comment-text">
                                      {c.text}
                                    </div>
                                  </div>
                                  <button
                                    className="checkin-comment-delete"
                                    onClick={() =>
                                      deleteComment(
                                        task.id,
                                        c.id
                                      )
                                    }
                                    aria-label="删除"
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="checkin-comment-input">
                          <input
                            type="text"
                            value={
                              commentDrafts[task.id] ?? ""
                            }
                            onChange={(e) =>
                              setCommentDrafts(
                                (prev) => ({
                                  ...prev,
                                  [task.id]:
                                    e.target.value,
                                })
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                submitUserComment(
                                  task.id
                                );
                              }
                            }}
                            placeholder="写一条评论…"
                            maxLength={100}
                          />
                          <button
                            className="checkin-comment-send"
                            onClick={() =>
                              submitUserComment(task.id)
                            }
                            disabled={
                              !(
                                commentDrafts[task.id] ??
                                ""
                              ).trim()
                            }
                          >
                            评论
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <button
            className="checkin-random-task"
            onClick={handleAddRandomTask}
          >
            <SparkleIcon />
            <span>Random Task</span>
          </button>
        </div>
      )}

      {/* ============ Pomodoro ============ */}
      {tab === "pomodoro" && (
        <div className="checkin-scroll">
          <PomodoroPanel
            activeTaskName={pomodoroTask?.name ?? null}
          />

          {pomodoroTaskId && (
            <button
              className="checkin-pomo-unbind"
              onClick={() => bindTask(null)}
            >
              取消绑定任务
            </button>
          )}
        </div>
      )}

      {/* ============ History ============ */}
      {tab === "history" && (
        <div className="checkin-scroll">
          {tasks.length === 0 ? (
            <div className="checkin-empty">
              <div className="checkin-empty-icon">
                ✦
              </div>
              <div className="checkin-empty-title">
                还没有历史
              </div>
              <div className="checkin-empty-desc">
                先建立一些任务，然后开始打卡
              </div>
            </div>
          ) : (
            <ul className="checkin-history">
              {historyDays.map((d) => (
                <li
                  key={d.dateStr}
                  className={`checkin-history-item${
                    d.completed === 0
                      ? " is-empty"
                      : ""
                  }`}
                >
                  <div className="checkin-history-date">
                    <div className="checkin-history-weekday">
                      {formatWeekday(d.dateStr)}
                    </div>
                    <div className="checkin-history-date-num">
                      {formatDateLabel(d.dateStr)}
                    </div>
                  </div>

                  <div className="checkin-history-progress">
                    <div
                      className="checkin-history-bar"
                      style={{
                        width: `${
                          d.total > 0
                            ? (d.completed / d.total) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>

                  <div className="checkin-history-count">
                    {d.completed} / {d.total}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Dock */}
      <nav className="checkin-dock">
        <div className="checkin-dock-inner">
          <button
            className={`checkin-dock-tab${
              tab === "today" ? " active" : ""
            }`}
            onClick={() => setTab("today")}
            aria-label="Today"
          >
            <TodayIcon />
            <span>Today</span>
          </button>

          <button
            className={`checkin-dock-tab${
              tab === "pomodoro" ? " active" : ""
            }`}
            onClick={() => setTab("pomodoro")}
            aria-label="Pomodoro"
          >
            <TimerIcon />
            <span>Pomodoro</span>
          </button>

          <button
            className={`checkin-dock-tab${
              tab === "history" ? " active" : ""
            }`}
            onClick={() => setTab("history")}
            aria-label="History"
          >
            <HistoryIcon />
            <span>History</span>
          </button>
        </div>
      </nav>

      {/* 添加任务弹窗 */}
      {showAddTask && (
        <div
          className="checkin-modal-backdrop"
          onClick={() => setShowAddTask(false)}
        >
          <div
            className="checkin-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="checkin-modal-header">
              <h2>New Task</h2>
              <button
                className="checkin-modal-close"
                onClick={() => setShowAddTask(false)}
              >
                ×
              </button>
            </div>

            <label className="checkin-field">
              <span>任务名</span>
              <input
                type="text"
                value={newTaskName}
                onChange={(e) =>
                  setNewTaskName(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTask();
                  }
                }}
                placeholder="例如 喝水"
                maxLength={60}
                autoFocus
              />
            </label>

            <div className="checkin-modal-footer">
              <button
                className="checkin-btn ghost"
                onClick={() => setShowAddTask(false)}
              >
                取消
              </button>
              <button
                className="checkin-btn"
                onClick={handleAddTask}
                disabled={!newTaskName.trim()}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 卡池编辑 */}
      {showPoolEditor && (
        <PoolEditor
          taskCards={taskCards}
          commentCards={commentCards}
          onChangeTaskCards={commitTaskCards}
          onChangeCommentCards={commitCommentCards}
          onClose={() => setShowPoolEditor(false)}
        />
      )}
    </main>
  );
}