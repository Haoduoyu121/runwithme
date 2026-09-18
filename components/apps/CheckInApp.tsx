"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  CalendarCheck,
  Check,
  ChevronLeft,
  History,
  ListChecks,
  Plus,
  Settings,
  Sparkles,
  Timer,
  X,
} from "lucide-react";

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
  type BlockCard,
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

import {
  loadBlockCards,
  saveBlockCards,
} from "@/lib/checkinBlockCardStorage";

import { usePomodoro } from "@/lib/PomodoroContext";
import {
  useCharacterAvatars,
  toAvatarKey,
} from "@/lib/useCharacterAvatars";

import PomodoroPanel from "@/components/apps/checkin/PomodoroPanel";
import PoolEditor from "@/components/apps/checkin/PoolEditor";

type CheckInAppProps = {
  onBack: () => void;
};

type Tab = "today" | "pomodoro" | "history";

export default function CheckInApp({
  onBack,
}: CheckInAppProps) {
  const {
    boundTaskId: pomodoroTaskId,
    bindTask,
    onFocusComplete,
    running: pomodoroRunning,
  } = usePomodoro();

  const avatars = useCharacterAvatars();

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
  const [blockCards, setBlockCards] = useState<BlockCard[]>(
    []
  );

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

  const commentCardsRef = useRef(commentCards);
  useEffect(() => {
    commentCardsRef.current = commentCards;
  }, [commentCards]);

  /* ---------- 初始化 ---------- */

  useEffect(() => {
    setTasks(loadTasks());
    setRecords(loadRecords());
    setTaskCards(loadTaskCards());
    setCommentCards(loadCommentCards());
    setBlockCards(loadBlockCards());
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
  const commitBlockCards = useCallback(
    (next: BlockCard[]) => {
      setBlockCards(next);
      saveBlockCards(next);
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

      const pendingComment = prev.pendingComment
        ? prev.pendingComment
        : {
            scheduledAt:
              Date.now() +
              (10 + Math.random() * 50) * 1000,
          };

      const next = {
        ...recordsRef.current,
        [key]: {
          ...prev,
          pomodoroCount: prev.pomodoroCount + 1,
          pendingComment,
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

      if (!nowCompleted) {
        return {
          ...prev,
          completed: false,
          completedAt: undefined,
          pendingComment: undefined,
        };
      }

      let pendingComment = prev.pendingComment;

      if (
        prev.comments.length === 0 &&
        !pendingComment
      ) {
        pendingComment = {
          scheduledAt:
            Date.now() + (10 + Math.random() * 50) * 1000,
        };
      }

      return {
        ...prev,
        completed: true,
        completedAt: Date.now(),
        pendingComment,
      };
    });
  }

  /* 从卡池抽 0~2 条评论 */
  function generateCommentsFromPool(
    cards: CommentCard[]
  ): TaskComment[] {
    const result: TaskComment[] = [];

    if (Math.random() > 0.7) return result;

    const pick1 = pickRandomEnabled(cards);
    if (!pick1) return result;

    result.push({
      id: createTaskCommentId(),
      author: pick1.character,
      text: pick1.text,
      createdAt: Date.now(),
    });

    if (Math.random() < 0.3) {
      const others = cards.filter(
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

  /* ---------- 延迟评论：每 5s 检查一次 ---------- */

  const checkPendingComments = useCallback(() => {
    const now = Date.now();
    const current = recordsRef.current;

    let changed = false;
    const next: Record<string, DayTaskRecord> = {
      ...current,
    };

    for (const [key, rec] of Object.entries(current)) {
      if (!rec.pendingComment) continue;
      if (rec.pendingComment.scheduledAt > now) continue;

      const newComments = generateCommentsFromPool(
        commentCardsRef.current
      );

      next[key] = {
        ...rec,
        comments: [...rec.comments, ...newComments],
        pendingComment: undefined,
      };
      changed = true;
    }

    if (changed) commitRecords(next);
  }, [commitRecords]);

  useEffect(() => {
    checkPendingComments();

    const t = window.setInterval(() => {
      checkPendingComments();
    }, 5000);

    return () => window.clearInterval(t);
  }, [checkPendingComments]);

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
          <ChevronLeft size={26} strokeWidth={2.4} />
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
              <Settings size={18} strokeWidth={2} />
            </button>

            <button
              className="checkin-add-btn"
              onClick={() => {
                setNewTaskName("");
                setShowAddTask(true);
              }}
              aria-label="添加任务"
            >
              <Plus size={20} strokeWidth={2.4} />
            </button>
          </>
        ) : tab === "pomodoro" ? (
          <>
            <button
              className="checkin-icon-btn"
              onClick={() => setShowPoolEditor(true)}
              aria-label="卡池"
            >
              <Settings size={18} strokeWidth={2} />
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
                <ListChecks size={40} strokeWidth={1.4} />
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
                        {rec.completed && (
                          <Check
                            size={14}
                            strokeWidth={3}
                          />
                        )}
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
                        <Timer
                          size={14}
                          strokeWidth={2.2}
                        />
                      </button>

                      <button
                        className="checkin-task-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(task.id);
                        }}
                        aria-label="删除任务"
                      >
                        <X size={15} strokeWidth={2.2} />
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
                              const avatarKey =
                                toAvatarKey(c.author);
                              const avatarUrl = avatarKey
                                ? avatars[avatarKey]
                                : null;

                              return (
                                <div
                                  key={c.id}
                                  className="checkin-comment"
                                >
                                  <div
                                    className={`checkin-avatar checkin-avatar-small ${d.colorClass}${
                                      avatarUrl
                                        ? " has-image"
                                        : ""
                                    }`}
                                  >
                                    {avatarUrl ? (
                                      <img
                                        src={avatarUrl}
                                        alt={d.name}
                                      />
                                    ) : (
                                      d.initial
                                    )}
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
                                    <X
                                      size={14}
                                      strokeWidth={2.2}
                                    />
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
            <Sparkles size={18} strokeWidth={2} />
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
                <Sparkles size={36} strokeWidth={1.4} />
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
            <CalendarCheck size={22} strokeWidth={1.8} />
            <span>Today</span>
          </button>

          <button
            className={`checkin-dock-tab${
              tab === "pomodoro" ? " active" : ""
            }`}
            onClick={() => setTab("pomodoro")}
            aria-label="Pomodoro"
          >
            <Timer size={22} strokeWidth={1.8} />
            <span>Pomodoro</span>
          </button>

          <button
            className={`checkin-dock-tab${
              tab === "history" ? " active" : ""
            }`}
            onClick={() => setTab("history")}
            aria-label="History"
          >
            <History size={22} strokeWidth={1.8} />
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
                aria-label="关闭"
              >
                <X size={16} strokeWidth={2.4} />
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
          blockCards={blockCards}
          onChangeTaskCards={commitTaskCards}
          onChangeCommentCards={commitCommentCards}
          onChangeBlockCards={commitBlockCards}
          onClose={() => setShowPoolEditor(false)}
        />
      )}
    </main>
  );
}