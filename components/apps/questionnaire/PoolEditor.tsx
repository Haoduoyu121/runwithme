"use client";

import { useState } from "react";

import {
  createQCardId,
  type CharacterQuestionCard,
  type AnswerCard,
  type SystemQuestionCard,
} from "@/data/questionnaire";

type Pool = "character" | "answer" | "system";

type Props = {
  cqCards: CharacterQuestionCard[];
  acCards: AnswerCard[];
  sqCards: SystemQuestionCard[];
  onChangeCQ: (next: CharacterQuestionCard[]) => void;
  onChangeAC: (next: AnswerCard[]) => void;
  onChangeSQ: (next: SystemQuestionCard[]) => void;
  onClose: () => void;
};

export default function PoolEditor({
  cqCards,
  acCards,
  sqCards,
  onChangeCQ,
  onChangeAC,
  onChangeSQ,
  onClose,
}: Props) {
  const [pool, setPool] = useState<Pool>("character");
  const [tab, setTab] =
    useState<"Levi" | "Erwin">("Levi");
  const [newText, setNewText] = useState("");

  /* ---------- 当前编辑数据 ---------- */

  const cqList = cqCards.filter((c) => c.character === tab);
  const acList = acCards.filter((c) => c.character === tab);

  /* ---------- 添加 ---------- */

  function handleAdd() {
    const text = newText.trim();
    if (!text) return;

    if (pool === "character") {
      onChangeCQ([
        ...cqCards,
        {
          id: createQCardId(`${tab}-cq`),
          character: tab,
          text,
          enabled: true,
        },
      ]);
    } else if (pool === "answer") {
      onChangeAC([
        ...acCards,
        {
          id: createQCardId(`${tab}-ac`),
          character: tab,
          text,
          enabled: true,
        },
      ]);
    } else {
      onChangeSQ([
        ...sqCards,
        {
          id: createQCardId("system-sq"),
          text,
          enabled: true,
        },
      ]);
    }

    setNewText("");
  }

  /* ---------- 编辑 ---------- */

  function handleToggle(id: string) {
    if (pool === "character") {
      onChangeCQ(
        cqCards.map((c) =>
          c.id === id ? { ...c, enabled: !c.enabled } : c
        )
      );
    } else if (pool === "answer") {
      onChangeAC(
        acCards.map((c) =>
          c.id === id ? { ...c, enabled: !c.enabled } : c
        )
      );
    } else {
      onChangeSQ(
        sqCards.map((c) =>
          c.id === id ? { ...c, enabled: !c.enabled } : c
        )
      );
    }
  }

  function handleDelete(id: string) {
    if (pool === "character") {
      onChangeCQ(cqCards.filter((c) => c.id !== id));
    } else if (pool === "answer") {
      onChangeAC(acCards.filter((c) => c.id !== id));
    } else {
      onChangeSQ(sqCards.filter((c) => c.id !== id));
    }
  }

  function handleRename(id: string, text: string) {
    if (pool === "character") {
      onChangeCQ(
        cqCards.map((c) =>
          c.id === id ? { ...c, text } : c
        )
      );
    } else if (pool === "answer") {
      onChangeAC(
        acCards.map((c) =>
          c.id === id ? { ...c, text } : c
        )
      );
    } else {
      onChangeSQ(
        sqCards.map((c) =>
          c.id === id ? { ...c, text } : c
        )
      );
    }
  }

  /* 当前展示的列表 */
  const currentList =
    pool === "character"
      ? cqList
      : pool === "answer"
        ? acList
        : sqCards;

  /* placeholder */
  const placeholder =
    pool === "character"
      ? "新增问题（Levi/Erwin 主动问 Yui）…"
      : pool === "answer"
        ? "新增回答（Levi/Erwin 回答 Yui）…"
        : "新增系统问题（每日问卷）…";

  return (
    <div
      className="q-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="q-modal q-pool-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="q-modal-header">
          <h2>Card Pools</h2>

          <button
            className="q-modal-close"
            onClick={onClose}
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        {/* 卡池切换 */}
        <div className="q-segment q-pool-row">
          <button
            className={
              pool === "character" ? "active" : ""
            }
            onClick={() => setPool("character")}
          >
            Character Q
          </button>
          <button
            className={pool === "answer" ? "active" : ""}
            onClick={() => setPool("answer")}
          >
            Answer
          </button>
          <button
            className={pool === "system" ? "active" : ""}
            onClick={() => setPool("system")}
          >
            System Q
          </button>
        </div>

        {/* 角色切换（仅 character / answer） */}
        {pool !== "system" && (
          <div className="q-segment q-pool-row">
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

        {/* 添加 */}
        <div className="q-pool-add">
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
            placeholder={placeholder}
            maxLength={80}
          />
          <button onClick={handleAdd}>添加</button>
        </div>

        {/* 列表 */}
        <div className="q-pool-list">
          {currentList.length === 0 ? (
            <div className="q-pool-empty">
              还没有卡片
            </div>
          ) : (
            currentList.map((c) => (
              <div
                key={c.id}
                className={`q-pool-item${
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
                  className="q-pool-toggle"
                  onClick={() => handleToggle(c.id)}
                >
                  {c.enabled ? "停用" : "启用"}
                </button>

                <button
                  className="q-pool-delete"
                  onClick={() => handleDelete(c.id)}
                  aria-label="删除"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        <div className="q-modal-footer">
          <button className="q-btn" onClick={onClose}>
            完成
          </button>
        </div>
      </div>
    </div>
  );
}