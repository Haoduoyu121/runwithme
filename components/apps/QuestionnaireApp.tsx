"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createQAnswerId,
  createQPostId,
  formatQTimeAgo,
  getModeLabel,
  getQAuthorDisplay,
  pickAnswerDelay,
  pickRandomEnabled,
  todayStr,
  type AnswerCard,
  type CharacterQuestionCard,
  type QAnswer,
  type QCharacter,
  type QPendingAnswer,
  type QPost,
  type QPostMode,
  type SystemQuestionCard,
} from "@/data/questionnaire";

import {
  loadACCards,
  loadCQCards,
  loadDailyRecords,
  loadQPosts,
  loadSQCards,
  saveACCards,
  saveCQCards,
  saveDailyRecords,
  saveQPosts,
  saveSQCards,
} from "@/lib/questionnaireStorage";

import PoolEditor from "@/components/apps/questionnaire/PoolEditor";

type QuestionnaireAppProps = {
  onBack: () => void;
};

type Filter = "all" | "mine" | "theirs" | "daily";

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

/* =========================================================
   主组件
   ========================================================= */

export default function QuestionnaireApp({
  onBack,
}: QuestionnaireAppProps) {
  const [posts, setPosts] = useState<QPost[]>([]);
  const [cqCards, setCQCards] = useState<
    CharacterQuestionCard[]
  >([]);
  const [acCards, setACCards] = useState<AnswerCard[]>([]);
  const [sqCards, setSQCards] = useState<
    SystemQuestionCard[]
  >([]);

  const [filter, setFilter] = useState<Filter>("all");

  const [showPoolEditor, setShowPoolEditor] =
    useState(false);

  const [showAskModal, setShowAskModal] = useState(false);
  const [askText, setAskText] = useState("");

  const [replyDrafts, setReplyDrafts] = useState<
    Record<string, string>
  >({});

  /* 引用最新的 posts，避免闭包过期 */
  const postsRef = useRef<QPost[]>([]);
  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  const acCardsRef = useRef<AnswerCard[]>([]);
  useEffect(() => {
    acCardsRef.current = acCards;
  }, [acCards]);

  const cqCardsRef = useRef<CharacterQuestionCard[]>([]);
  useEffect(() => {
    cqCardsRef.current = cqCards;
  }, [cqCards]);

  const sqCardsRef = useRef<SystemQuestionCard[]>([]);
  useEffect(() => {
    sqCardsRef.current = sqCards;
  }, [sqCards]);

  /* ---------- 提交 ---------- */

  const commitPosts = useCallback((next: QPost[]) => {
    setPosts(next);
    saveQPosts(next);
  }, []);

  /* ---------- 处理到期的 pending 回答 ---------- */

  const processPendingAnswers = useCallback(() => {
    const now = Date.now();
    const currentPosts = postsRef.current;
    const answers = acCardsRef.current;

    let changed = false;

    const next = currentPosts.map((p) => {
      const duePendings = p.pending.filter(
        (pnd) => pnd.scheduledAt <= now
      );
      if (duePendings.length === 0) return p;

      const newAnswers = [...p.answers];

      for (const pnd of duePendings) {
        const card = pickRandomEnabled(
          answers.filter(
            (c) => c.character === pnd.character
          )
        );
        if (!card) continue;

        newAnswers.push({
          id: createQAnswerId(),
          author: pnd.character,
          text: card.text,
          createdAt: now,
        });

        changed = true;
      }

      return {
        ...p,
        answers: newAnswers,
        pending: p.pending.filter(
          (pnd) => pnd.scheduledAt > now
        ),
      };
    });

    if (changed) commitPosts(next);
  }, [commitPosts]);

  /* ---------- 初始化 + 每日自动生成 ---------- */

  useEffect(() => {
    const savedPosts = loadQPosts();
    const cq = loadCQCards();
    const ac = loadACCards();
    const sq = loadSQCards();

    setCQCards(cq);
    setACCards(ac);
    setSQCards(sq);
    cqCardsRef.current = cq;
    acCardsRef.current = ac;
    sqCardsRef.current = sq;

    /* 每日自动生成 */
    const daily = loadDailyRecords();
    const today = todayStr();

    const hasDailyToday = daily.some(
      (d) => d.dateStr === today
    );

    let nextPosts = [...savedPosts];
    const nextDaily = [...daily];

    if (!hasDailyToday) {
      /* 生成 Daily Question */
      const sqPick = pickRandomEnabled(sq);
      if (sqPick) {
        const now = Date.now();
        const dailyPost: QPost = {
          id: createQPostId(),
          mode: "daily",
          question: sqPick.text,
          createdAt: now,
          answers: [],
          pending: [
            {
              character: "Levi",
              scheduledAt: now + pickAnswerDelay(),
            },
            {
              character: "Erwin",
              scheduledAt: now + pickAnswerDelay(),
            },
          ],
        };
        nextPosts = [dailyPost, ...nextPosts];
        nextDaily.push({
          dateStr: today,
          postId: dailyPost.id,
        });
      }
    }

    /* 每天自动生成 1 条 Character Question */
    const hasCharacterToday = nextPosts.some(
      (p) =>
        p.mode === "character-asked" &&
        new Date(p.createdAt).toDateString() ===
          new Date().toDateString()
    );

    if (!hasCharacterToday) {
      const cqPick = pickRandomEnabled(cq);
      if (cqPick) {
        const charPost: QPost = {
          id: createQPostId(),
          mode: "character-asked",
          question: cqPick.text,
          askedBy: cqPick.character,
          createdAt: Date.now(),
          answers: [],
          pending: [],
        };
        nextPosts = [charPost, ...nextPosts];
      }
    }

    setPosts(nextPosts);
    saveQPosts(nextPosts);
    saveDailyRecords(nextDaily);

    /* 处理过期 pending */
    setTimeout(() => processPendingAnswers(), 100);
  }, [processPendingAnswers]);

  /* 定时检查 pending */
  useEffect(() => {
    const t = window.setInterval(() => {
      processPendingAnswers();
    }, 60 * 1000);
    return () => window.clearInterval(t);
  }, [processPendingAnswers]);

  /* ---------- 用户提问 ---------- */

  function submitUserQuestion() {
    const text = askText.trim();
    if (!text) return;

    const now = Date.now();

    const pending: QPendingAnswer[] = [
      {
        character: "Levi",
        scheduledAt: now + pickAnswerDelay(),
      },
      {
        character: "Erwin",
        scheduledAt: now + pickAnswerDelay(),
      },
    ];

    const post: QPost = {
      id: createQPostId(),
      mode: "user-asked",
      question: text,
      createdAt: now,
      answers: [],
      pending,
    };

    commitPosts([post, ...postsRef.current]);
    setAskText("");
    setShowAskModal(false);
  }

  /* ---------- 手动触发角色主动提问 ---------- */

  function triggerCharacterQuestion() {
    const cq = cqCardsRef.current;
    const pick = pickRandomEnabled(cq);
    if (!pick) {
      alert("Character Question 卡池为空。");
      return;
    }

    const post: QPost = {
      id: createQPostId(),
      mode: "character-asked",
      question: pick.text,
      askedBy: pick.character,
      createdAt: Date.now(),
      answers: [],
      pending: [],
    };

    commitPosts([post, ...postsRef.current]);
  }

  /* ---------- Yui 回答（character-asked / daily） ---------- */

  function submitYuiAnswer(postId: string) {
    const text = (replyDrafts[postId] ?? "").trim();
    if (!text) return;

    const next = postsRef.current.map((p) =>
      p.id === postId
        ? {
            ...p,
            answers: [
              ...p.answers,
              {
                id: createQAnswerId(),
                author: "Yui" as const,
                text,
                createdAt: Date.now(),
              },
            ],
            yuiAnswered: true,
          }
        : p
    );

    commitPosts(next);
    setReplyDrafts((prev) => {
      const copy = { ...prev };
      delete copy[postId];
      return copy;
    });
  }

  /* ---------- 删除 ---------- */

  function deletePost(id: string) {
    if (!window.confirm("删除这条问卷？")) return;
    commitPosts(postsRef.current.filter((p) => p.id !== id));
  }

  function deleteAnswer(postId: string, answerId: string) {
    if (!window.confirm("删除这条回答？")) return;

    const next = postsRef.current.map((p) =>
      p.id === postId
        ? {
            ...p,
            answers: p.answers.filter(
              (a) => a.id !== answerId
            ),
          }
        : p
    );
    commitPosts(next);
  }

  /* ---------- 过滤 ---------- */

  const visiblePosts = useMemo(() => {
    const sorted = [...posts].sort(
      (a, b) => b.createdAt - a.createdAt
    );

    if (filter === "all") return sorted;
    if (filter === "mine")
      return sorted.filter((p) => p.mode === "user-asked");
    if (filter === "theirs")
      return sorted.filter(
        (p) => p.mode === "character-asked"
      );
    return sorted.filter((p) => p.mode === "daily");
  }, [posts, filter]);

  /* ---------- 卡片渲染 ---------- */

  function renderPost(post: QPost) {
    const modeLabel = getModeLabel(post.mode);

    const asker: QCharacter | null =
      post.mode === "character-asked"
        ? post.askedBy ?? null
        : null;

    const askerDisplay = asker
      ? getQAuthorDisplay(asker)
      : null;

    /* 顶部小标题 */
    let title = "";
    if (post.mode === "user-asked") {
      title = "Yui 提问";
    } else if (post.mode === "character-asked") {
      title = `${asker ?? ""} 提问`;
    } else {
      title = "Daily Question";
    }

    /* 是否显示"等待 Yui 回答"输入框 */
    const showYuiReply =
      !post.yuiAnswered &&
      (post.mode === "character-asked" ||
        post.mode === "daily");

    /* 等待角色回答 */
    const waitingCharacters = post.pending.map(
      (p) => p.character
    );

    /* 检查角色是否已经回答 */
    const answeredCharacters = new Set(
      post.answers
        .filter((a) => a.author !== "Yui")
        .map((a) => a.author as QCharacter)
    );

    return (
      <article
        key={post.id}
        className="q-post"
        data-mode={post.mode}
      >
        {/* 头部 */}
        <div className="q-post-head">
          <div className="q-post-mode-tag">
            {modeLabel}
          </div>

          <div className="q-post-time">
            {formatQTimeAgo(post.createdAt)}
          </div>

          <button
            className="q-post-delete"
            onClick={() => deletePost(post.id)}
            aria-label="删除"
          >
            ×
          </button>
        </div>

        {/* 提问人 */}
        {asker && askerDisplay && (
          <div className="q-post-asker">
            <div
              className={`q-avatar q-avatar-small ${askerDisplay.colorClass}`}
            >
              {askerDisplay.initial}
            </div>
            <span>{askerDisplay.name}</span>
          </div>
        )}

        {/* 问题 */}
        <div className="q-post-question">
          {post.question}
        </div>

        {/* 回答列表 */}
        {post.answers.length > 0 && (
          <div className="q-post-answers">
            {post.answers.map((a) => {
              const aDisplay = getQAuthorDisplay(a.author);
              return (
                <div
                  key={a.id}
                  className="q-answer"
                >
                  <div
                    className={`q-avatar q-avatar-small ${aDisplay.colorClass}`}
                  >
                    {aDisplay.initial}
                  </div>

                  <div className="q-answer-body">
                    <div className="q-answer-head">
                      <strong>{aDisplay.name}</strong>
                    </div>
                    <div className="q-answer-text">
                      {a.text}
                    </div>
                  </div>

                  <button
                    className="q-answer-delete"
                    onClick={() =>
                      deleteAnswer(post.id, a.id)
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

        {/* 等待角色回答 */}
        {post.mode !== "character-asked" &&
          waitingCharacters.length > 0 && (
            <div className="q-answer-pending">
              {waitingCharacters.map((c) => {
                const d = getQAuthorDisplay(c);
                return (
                  <div
                    key={c}
                    className="q-answer-pending-row"
                  >
                    <div
                      className={`q-avatar q-avatar-small ${d.colorClass}`}
                    >
                      {d.initial}
                    </div>
                    <span>{d.name} 正在回答…</span>
                  </div>
                );
              })}
            </div>
          )}

        {/* Yui 的输入框 */}
        {showYuiReply && (
          <div className="q-post-reply">
            <input
              type="text"
              value={replyDrafts[post.id] ?? ""}
              onChange={(e) =>
                setReplyDrafts((prev) => ({
                  ...prev,
                  [post.id]: e.target.value,
                }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitYuiAnswer(post.id);
                }
              }}
              placeholder="写下你的回答…"
              maxLength={200}
            />
            <button
              className="q-post-reply-send"
              onClick={() => submitYuiAnswer(post.id)}
              disabled={
                !(replyDrafts[post.id] ?? "").trim()
              }
            >
              回答
            </button>
          </div>
        )}

        {/* 如果 Yui 已回答（character-asked），显示一个小标签 */}
        {post.mode === "character-asked" &&
          post.yuiAnswered && (
            <div className="q-post-hint">
              已回复
            </div>
          )}

        {/* 如果 daily 已由 Yui 回答，但 Levi/Erwin 还在 pending 里 —— 已经在上面处理 */}
        {answeredCharacters.size > 0 &&
          post.pending.length > 0 &&
          post.mode !== "character-asked" && (
            <div className="q-post-hint q-post-hint-small">
              等待{" "}
              {post.pending
                .map((p) => p.character)
                .join("、")}{" "}
              回答
            </div>
          )}
      </article>
    );
  }

  /* ---------- Render ---------- */

  return (
    <main className="app-screen q-app">
      {/* Header */}
      <header className="q-header">
        <button
          className="q-back"
          onClick={onBack}
          aria-label="返回"
        >
          ‹
        </button>

        <div className="q-header-center">
          <div className="q-header-title">
            Questionnaire
          </div>
          <div className="q-header-sub">
            {posts.length} posts
          </div>
        </div>

        <button
          className="q-icon-btn"
          onClick={triggerCharacterQuestion}
          aria-label="随机提问"
        >
          <SparkleIcon />
        </button>

        <button
          className="q-icon-btn"
          onClick={() => setShowPoolEditor(true)}
          aria-label="卡池"
        >
          <GearIcon />
        </button>

        <button
          className="q-add-btn"
          onClick={() => {
            setAskText("");
            setShowAskModal(true);
          }}
          aria-label="提问"
        >
          <PlusIcon />
        </button>
      </header>

      {/* 过滤 tab */}
      <div className="q-filter">
        {(
          [
            { key: "all", label: "All" },
            { key: "mine", label: "Mine" },
            { key: "theirs", label: "Theirs" },
            { key: "daily", label: "Daily" },
          ] as { key: Filter; label: string }[]
        ).map((f) => (
          <button
            key={f.key}
            className={
              filter === f.key
                ? "q-filter-btn active"
                : "q-filter-btn"
            }
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 列表 */}
      <div className="q-scroll">
        {visiblePosts.length === 0 ? (
          <div className="q-empty">
            <div className="q-empty-icon">✦</div>
            <div className="q-empty-title">
              还没有问卷
            </div>
            <div className="q-empty-desc">
              点右上角 ＋ 提问，或点 ✦ 让他们先问一个
            </div>
          </div>
        ) : (
          visiblePosts.map(renderPost)
        )}
      </div>

      {/* 提问弹窗 */}
      {showAskModal && (
        <div
          className="q-modal-backdrop"
          onClick={() => setShowAskModal(false)}
        >
          <div
            className="q-modal q-ask-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="q-modal-header">
              <h2>New Question</h2>
              <button
                className="q-modal-close"
                onClick={() => setShowAskModal(false)}
              >
                ×
              </button>
            </div>

            <div className="q-ask-to">
              Levi 和 Erwin 都会回答
            </div>

            <textarea
              className="q-ask-textarea"
              value={askText}
              onChange={(e) =>
                setAskText(e.target.value)
              }
              placeholder="问他们一个问题…"
              maxLength={200}
              autoFocus
              rows={4}
            />

            <div className="q-modal-footer">
              <button
                className="q-btn ghost"
                onClick={() => setShowAskModal(false)}
              >
                取消
              </button>
              <button
                className="q-btn"
                onClick={submitUserQuestion}
                disabled={!askText.trim()}
              >
                发布
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 卡池编辑 */}
      {showPoolEditor && (
        <PoolEditor
          cqCards={cqCards}
          acCards={acCards}
          sqCards={sqCards}
          onChangeCQ={(next) => {
            setCQCards(next);
            saveCQCards(next);
          }}
          onChangeAC={(next) => {
            setACCards(next);
            saveACCards(next);
          }}
          onChangeSQ={(next) => {
            setSQCards(next);
            saveSQCards(next);
          }}
          onClose={() => setShowPoolEditor(false)}
        />
      )}
    </main>
  );
}