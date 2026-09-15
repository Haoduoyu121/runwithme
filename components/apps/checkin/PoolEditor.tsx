"use client";

import { useState } from "react";

import {
  createCommentCardId,
  createTaskCardId,
  type CommentCard,
  type TaskCard,
} from "@/data/checkin";

type Props = {
  taskCards: TaskCard[];
  commentCards: CommentCard[];
  onChangeTaskCards: (next: TaskCard[]) => void;
  onChangeCommentCards: (next: CommentCard[]) => void;
  onClose: () => void;
};

type Pool = "task" | "comment";

export default function PoolEditor({
  taskCards,
  commentCards,
  onChangeTaskCards,
  onChangeCommentCards,
  onClose,
}: Props) {
  const [pool, setPool] = useState<Pool>("task");
  const [tab, setTab] =
    useState<"Levi" | "Erwin">("Levi");
  const [newText, setNewText] = useState("");

  const commentList = commentCards.filter(
    (c) => c.character === tab
  );

  function handleAdd() {
    const text = newText.trim();
    if (!text) return;

    if (pool === "task") {
      onChangeTaskCards([
        ...taskCards,
        {
          id: createTaskCardId(),
          text,
          enabled: true,
        },
      ]);
    } else {
      onChangeCommentCards([
        ...commentCards,
        {
          id: createCommentCardId(tab),
          character: tab,
          text,
          enabled: true,
        },
      ]);
    }

    setNewText("");
  }

  function handleToggle(id: string) {
    if (pool === "task") {
      onChangeTaskCards(
        taskCards.map((c) =>
          c.id === id ? { ...c, enabled: !c.enabled } : c
        )
      );
    } else {
      onChangeCommentCards(
        commentCards.map((c) =>
          c.id === id ? { ...c, enabled: !c.enabled } : c
        )
      );
    }
  }

  function handleDelete(id: string) {
    if (pool === "task") {
      onChangeTaskCards(taskCards.filter((c) => c.id !== id));
    } else {
      onChangeCommentCards(
        commentCards.filter((c) => c.id !== id)
      );
    }
  }

  function handleRename(id: string, text: string) {
    if (pool === "task") {
      onChangeTaskCards(
        taskCards.map((c) =>
          c.id === id ? { ...c, text } : c
        )
      );
    } else {
      onChangeCommentCards(
        commentCards.map((c) =>
          c.id === id ? { ...c, text } : c
        )
      );
    }
  }

  const currentList =
    pool === "task" ? taskCards : commentList;

  return (
    <div
      className="checkin-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="checkin-modal checkin-pool-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="checkin-modal-header">
          <h2>Card Pools</h2>
          <button
            className="checkin-modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="checkin-segment">
          <button
            className={pool === "task" ? "active" : ""}
            onClick={() => setPool("task")}
          >
            Task Cards
          </button>
          <button
            className={
              pool === "comment" ? "active" : ""
            }
            onClick={() => setPool("comment")}
          >
            Comment Cards
          </button>
        </div>

        {pool === "comment" && (
          <div className="checkin-segment">
            <button
              className={tab === "Levi" ? "active" : ""}
              onClick={() => setTab("Levi")}
            >
              Levi
            </button>
            <button
              className={tab === "Erwin" ? "active" : ""}
              onClick={() => setTab("Erwin")}
            >
              Erwin
            </button>
          </div>
        )}

        <div className="checkin-pool-add">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder={
              pool === "task"
                ? "新增任务卡…"
                : "新增评论卡…"
            }
            maxLength={80}
          />
          <button onClick={handleAdd}>添加</button>
        </div>

        <div className="checkin-pool-list">
          {currentList.length === 0 ? (
            <div className="checkin-pool-empty">
              还没有卡片
            </div>
          ) : (
            currentList.map((c) => (
              <div
                key={c.id}
                className={`checkin-pool-item${
                  c.enabled ? "" : " is-disabled"
                }`}
              >
                <input
                  type="text"
                  value={c.text}
                  onChange={(e) =>
                    handleRename(c.id, e.target.value)
                  }
                  maxLength={80}
                />

                <button
                  className="checkin-pool-toggle"
                  onClick={() => handleToggle(c.id)}
                >
                  {c.enabled ? "停用" : "启用"}
                </button>

                <button
                  className="checkin-pool-delete"
                  onClick={() => handleDelete(c.id)}
                  aria-label="删除"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        <div className="checkin-modal-footer">
          <button
            className="checkin-btn"
            onClick={onClose}
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}