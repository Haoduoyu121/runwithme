"use client";

import { useMemo, useState } from "react";

import { useLetters } from "@/lib/LetterContext";

import {
  formatLetterDate,
  formatLetterDateTime,
  formatRelative,
  type Letter,
} from "@/data/letter";

type LetterAppProps = { onBack: () => void };
type Tab = "Levi" | "Erwin";

const IOS_SAFE = {
  position: "fixed",
  top: 0,
  left: 0,
  width: 1,
  height: 1,
  opacity: 0,
  overflow: "hidden",
  zIndex: -1,
} as React.CSSProperties;

function avatarLabel(sender: "You" | "Levi" | "Erwin") {
  if (sender === "You") return "Y";
  return sender.charAt(0);
}

function avatarClass(sender: "You" | "Levi" | "Erwin") {
  if (sender === "You") return "letter-avatar letter-avatar-you";
  if (sender === "Levi")
    return "letter-avatar letter-avatar-levi";
  return "letter-avatar letter-avatar-erwin";
}

function LetterCard({
  letter,
  onOpen,
}: {
  letter: Letter;
  onOpen: () => void;
}) {
  const isIncoming = letter.from !== "You";

  return (
    <button
      className={`letter-card${isIncoming && !letter.read ? " is-unread" : ""}`}
      onClick={onOpen}
    >
      <div className={avatarClass(letter.from)}>
        {avatarLabel(letter.from)}
      </div>

      <div className="letter-card-body">
        <div className="letter-card-row">
          <strong className="letter-card-name">
            {letter.from === "You"
              ? `寄给 ${letter.to}`
              : letter.from}
          </strong>
          <span className="letter-card-time">
            {formatRelative(letter.createdAt)}
          </span>
        </div>

        <div className="letter-card-subject">
          {letter.subject}
        </div>

        <div className="letter-card-preview">
          {letter.body.replace(/\n+/g, " ").slice(0, 40)}
          {letter.body.length > 40 ? "…" : ""}
        </div>
      </div>

      {isIncoming && !letter.read && (
        <span className="letter-card-dot" />
      )}
    </button>
  );
}

/* -------------------------------------------------------
   详情
   ------------------------------------------------------- */

function LetterDetail({
  letter,
  onClose,
  onDelete,
}: {
  letter: Letter;
  onClose: () => void;
  onDelete: () => void;
}) {
  const senderName =
    letter.from === "You" ? "You" : letter.from;
  const receiverName =
    letter.to === "You" ? "You" : letter.to;

  return (
    <div className="letter-detail">
      <div className="letter-detail-header">
        <button
          className="letter-detail-back"
          onClick={onClose}
          aria-label="关闭"
        >
          ‹
        </button>
        <div className="letter-detail-title">信件</div>
        <button
          className="letter-detail-delete"
          onClick={onDelete}
          aria-label="删除"
        >
          🗑
        </button>
      </div>

      <div className="letter-detail-scroll">
        <div className="letter-paper">
          <div className="letter-paper-head">
            <div className="letter-paper-row">
              <span className="letter-paper-label">
                From
              </span>
              <span className="letter-paper-value">
                {senderName}
              </span>
            </div>
            <div className="letter-paper-row">
              <span className="letter-paper-label">
                To
              </span>
              <span className="letter-paper-value">
                {receiverName}
              </span>
            </div>
            <div className="letter-paper-row">
              <span className="letter-paper-label">
                Date
              </span>
              <span className="letter-paper-value">
                {formatLetterDateTime(letter.createdAt)}
              </span>
            </div>
            <div className="letter-paper-row">
              <span className="letter-paper-label">
                Subject
              </span>
              <span className="letter-paper-value">
                {letter.subject}
              </span>
            </div>
          </div>

          <div className="letter-paper-divider" />

          <div className="letter-paper-body">
            {letter.body.split("\n\n").map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <div className="letter-paper-sign">
            <div>此致，</div>
            <div className="letter-paper-sign-name">
              {senderName}
            </div>
            <div className="letter-paper-sign-date">
              {formatLetterDate(letter.createdAt)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   写信
   ------------------------------------------------------- */

function LetterCompose({
  defaultTo,
  onClose,
  onSend,
}: {
  defaultTo: "Levi" | "Erwin";
  onClose: () => void;
  onSend: (
    to: "Levi" | "Erwin",
    subject: string,
    body: string
  ) => void;
}) {
  const [to, setTo] = useState<"Levi" | "Erwin">(
    defaultTo
  );
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  function handleSend() {
    if (!body.trim()) return;
    onSend(to, subject, body);
    onClose();
  }

  return (
    <div className="letter-compose">
      <div className="letter-detail-header">
        <button
          className="letter-detail-back"
          onClick={onClose}
          aria-label="关闭"
        >
          ✕
        </button>
        <div className="letter-detail-title">写信</div>
        <button
          className="letter-compose-send"
          onClick={handleSend}
          disabled={!body.trim()}
        >
          寄出
        </button>
      </div>

      <div className="letter-compose-scroll">
        <div className="letter-compose-paper">
          <div className="letter-paper-row">
            <span className="letter-paper-label">
              From
            </span>
            <span className="letter-paper-value">
              You
            </span>
          </div>

          <div className="letter-paper-row">
            <span className="letter-paper-label">
              To
            </span>
            <div className="letter-compose-to">
              <button
                className={
                  to === "Levi" ? "active" : ""
                }
                onClick={() => setTo("Levi")}
              >
                Levi
              </button>
              <button
                className={
                  to === "Erwin" ? "active" : ""
                }
                onClick={() => setTo("Erwin")}
              >
                Erwin
              </button>
            </div>
          </div>

          <div className="letter-paper-row">
            <span className="letter-paper-label">
              Subject
            </span>
            <input
              className="letter-compose-subject"
              value={subject}
              onChange={(e) =>
                setSubject(e.target.value)
              }
              placeholder="(无主题)"
              maxLength={50}
            />
          </div>

          <div className="letter-paper-divider" />

          <textarea
            className="letter-compose-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="写下你想说的话…"
            maxLength={2000}
            rows={14}
          />

          <div className="letter-compose-hint">
            对方会在 6~12 小时内回信。
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   主组件
   ------------------------------------------------------- */

export default function LetterApp({
  onBack,
}: LetterAppProps) {
  const {
    letters,
    sendLetterTo,
    markRead,
    deleteLetter,
  } = useLetters();

  const [tab, setTab] = useState<Tab>("Levi");
  const [showCompose, setShowCompose] = useState(false);
  const [openLetterId, setOpenLetterId] = useState<
    string | null
  >(null);

  const visibleLetters = useMemo(() => {
    return letters
      .filter(
        (l) =>
          (l.from === tab && l.to === "You") ||
          (l.from === "You" && l.to === tab)
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [letters, tab]);

  const openLetter = openLetterId
    ? letters.find((l) => l.id === openLetterId) ?? null
    : null;

  const unreadForTab = useMemo(() => {
    return letters.filter(
      (l) => l.from === tab && !l.read
    ).length;
  }, [letters, tab]);

  function handleOpenLetter(letter: Letter) {
    setOpenLetterId(letter.id);
    if (letter.from !== "You" && !letter.read) {
      markRead(letter.id);
    }
  }

  if (openLetter) {
    return (
      <main className="app-screen letter-app">
        <LetterDetail
          letter={openLetter}
          onClose={() => setOpenLetterId(null)}
          onDelete={() => {
            if (
              window.confirm("删除这封信？")
            ) {
              deleteLetter(openLetter.id);
              setOpenLetterId(null);
            }
          }}
        />
      </main>
    );
  }

  if (showCompose) {
    return (
      <main className="app-screen letter-app">
        <LetterCompose
          defaultTo={tab}
          onClose={() => setShowCompose(false)}
          onSend={sendLetterTo}
        />
      </main>
    );
  }

  return (
    <main className="app-screen letter-app">
      <header className="letter-header">
        <button
          className="letter-back"
          onClick={onBack}
          aria-label="返回"
        >
          ‹
        </button>

        <div className="letter-header-center">
          <div className="letter-header-title">Letters</div>
          <div className="letter-header-sub">
            {letters.length} 封信 · {unreadForTab} 未读
          </div>
        </div>

        <button
          className="letter-write-btn"
          onClick={() => setShowCompose(true)}
          aria-label="写新信"
        >
          ＋
        </button>
      </header>

      <div className="letter-tabs">
        {(["Levi", "Erwin"] as Tab[]).map((t) => {
          const unread = letters.filter(
            (l) => l.from === t && !l.read
          ).length;
          return (
            <button
              key={t}
              className={
                tab === t
                  ? "letter-tab active"
                  : "letter-tab"
              }
              onClick={() => setTab(t)}
            >
              {t}
              {unread > 0 && (
                <span className="letter-tab-dot">
                  {unread}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="letter-scroll">
        {visibleLetters.length === 0 ? (
          <div className="letter-empty">
            <div className="letter-empty-icon">✉</div>
            <div className="letter-empty-title">
              还没有信件
            </div>
            <div className="letter-empty-desc">
              点击右上角 ＋ 给 {tab} 写一封信吧
            </div>
          </div>
        ) : (
          <div className="letter-list">
            {visibleLetters.map((l) => (
              <LetterCard
                key={l.id}
                letter={l}
                onOpen={() => handleOpenLetter(l)}
              />
            ))}
          </div>
        )}
      </div>

      <button
        className="letter-fab"
        onClick={() => setShowCompose(true)}
        aria-label="写信"
      >
        ✎
      </button>
    </main>
  );
}