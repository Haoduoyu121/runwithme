"use client";

import { useEffect, useState } from "react";
import { X, Plus, Trash2, RotateCcw, Save } from "lucide-react";
import {
  loadGameChatPool,
  saveGameChatPool,
  resetGameChatPool,
  CONTEXT_LABELS,
  ALL_CONTEXTS,
  type StoredPool,
} from "@/lib/gameChatStorage";
import { GAME_CHAT_POOL, type GameChatContext } from "@/data/gameChatPool";

export default function GameChatSettingsPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const [pool, setPool] = useState<StoredPool>(GAME_CHAT_POOL);
  const [who, setWho] = useState<"levi" | "erwin">("levi");
  const [ctx, setCtx] = useState<GameChatContext>("mid");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setPool(loadGameChatPool());
  }, []);

  function patchLine(idx: number, text: string) {
    setPool((prev) => {
      const next: StoredPool = {
        levi: { ...prev.levi },
        erwin: { ...prev.erwin },
      };
      const list = [...next[who][ctx]];
      list[idx] = text;
      next[who][ctx] = list;
      return next;
    });
  }

  function addLine() {
    setPool((prev) => {
      const next: StoredPool = {
        levi: { ...prev.levi },
        erwin: { ...prev.erwin },
      };
      next[who][ctx] = [...next[who][ctx], ""];
      return next;
    });
  }

  function removeLine(idx: number) {
    setPool((prev) => {
      const next: StoredPool = {
        levi: { ...prev.levi },
        erwin: { ...prev.erwin },
      };
      next[who][ctx] = next[who][ctx].filter((_, i) => i !== idx);
      return next;
    });
  }

  function handleSave() {
    /* 清理空行 */
    const cleaned: StoredPool = {
      levi: { ...pool.levi },
      erwin: { ...pool.erwin },
    };
    for (const w of ["levi", "erwin"] as const) {
      for (const c of ALL_CONTEXTS) {
        cleaned[w][c] = cleaned[w][c]
          .map((x) => x.trim())
          .filter(Boolean);
      }
    }
    saveGameChatPool(cleaned);
    setPool(cleaned);
    setMsg("已保存");
    window.setTimeout(() => {
      setMsg("");
      onClose();
    }, 700);
  }

  function handleReset() {
    if (!window.confirm("恢复全部默认字卡？\n\n你的修改会丢失。"))
      return;
    resetGameChatPool();
    setPool(GAME_CHAT_POOL);
    setMsg("已恢复默认");
    window.setTimeout(() => setMsg(""), 1800);
  }

  const lines = pool[who][ctx];

  return (
    <div className="gm-panel-backdrop" onClick={onClose}>
      <div
        className="gm-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "90vh" }}
      >
        <div className="gm-panel-head">
          <span>游戏聊天字卡</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="gh-icon-btn"
              onClick={handleReset}
              title="恢复默认"
              aria-label="恢复默认"
            >
              <RotateCcw size={15} strokeWidth={2.2} />
            </button>
            <button
              className="gh-icon-btn"
              onClick={onClose}
              aria-label="关闭"
            >
              <X size={16} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        <div className="gm-panel-body gcp-body">
          {/* 角色切换 */}
          <div className="gcp-role-row">
            <button
              className={"gcp-role" + (who === "levi" ? " is-on" : "")}
              onClick={() => setWho("levi")}
            >
              Levi
            </button>
            <button
              className={"gcp-role" + (who === "erwin" ? " is-on" : "")}
              onClick={() => setWho("erwin")}
            >
              Erwin
            </button>
          </div>

          {/* 情境切换 */}
          <div className="gcp-ctx-row">
            {ALL_CONTEXTS.map((c) => (
              <button
                key={c}
                className={"gcp-ctx" + (ctx === c ? " is-on" : "")}
                onClick={() => setCtx(c)}
              >
                {CONTEXT_LABELS[c]}
                <span className="gcp-ctx-count">
                  {pool[who][c].length}
                </span>
              </button>
            ))}
          </div>

          {/* 当前情境内容 */}
          <div className="gcp-lines">
            {lines.length === 0 && (
              <div className="gm-panel-empty">
                还没有内容，点下方添加一条
              </div>
            )}
            {lines.map((l, i) => (
              <div key={i} className="gcp-line">
                <input
                  className="gm-chat-text"
                  value={l}
                  placeholder="输入一句台词…"
                  onChange={(e) => patchLine(i, e.target.value)}
                />
                <button
                  className="gcp-line-del"
                  onClick={() => removeLine(i)}
                  aria-label="删除"
                >
                  <Trash2 size={14} strokeWidth={2.2} />
                </button>
              </div>
            ))}
          </div>

          <button className="gcp-add" onClick={addLine}>
            <Plus size={14} strokeWidth={2.4} />
            添加一条
          </button>

          {msg && <div className="gcp-msg">{msg}</div>}
        </div>

        <div className="gm-panel-foot">
          <button
            className="gm-dialog-btn primary"
            onClick={handleSave}
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Save size={14} strokeWidth={2.4} />
            保存
          </button>
        </div>
      </div>
    </div>
  );
}