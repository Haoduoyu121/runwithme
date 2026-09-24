"use client";

import { useEffect, useState } from "react";
import {
  X,
  RotateCcw,
  Save,
  Pencil,
  Check,
  Sparkles,
  Skull,
  Plus,
  Trash2,
} from "lucide-react";
import {
  loadArcadeStats,
  updateArcadeStat,
  resetAllArcadeStats,
  loadRewardCards,
  saveRewardCards,
  resetRewardCards,
  type ArcadeGameStats,
  type ArcadePlayer,
  type RewardCards,
} from "@/lib/arcadeStorage";

const PLAYER_LABEL: Record<ArcadePlayer, string> = {
  you: "你",
  levi: "Levi",
  erwin: "Erwin",
};

type Tab = "record" | "rewards" | "penalties";

export default function ArcadeRecordPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("record");
  const [stats, setStats] = useState<ArcadeGameStats[]>([]);
  const [cards, setCards] = useState<RewardCards>({
    rewards: [],
    penalties: [],
  });
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState("");

  function reload() {
    setStats(loadArcadeStats());
    setCards(loadRewardCards());
  }

  useEffect(() => {
    reload();
  }, []);

  function setStat(
    game: ArcadeGameStats["key"],
    who: ArcadePlayer,
    field: "wins" | "losses" | "draws",
    value: number
  ) {
    updateArcadeStat(game, who, field, value);
    reload();
  }

  function setCardText(
    kind: "rewards" | "penalties",
    idx: number,
    text: string
  ) {
    setCards((prev) => {
      const list = [...prev[kind]];
      list[idx] = text;
      return { ...prev, [kind]: list };
    });
  }

  function addCard(kind: "rewards" | "penalties") {
    setCards((prev) => ({
      ...prev,
      [kind]: [...prev[kind], ""],
    }));
  }

  function removeCard(kind: "rewards" | "penalties", idx: number) {
    setCards((prev) => ({
      ...prev,
      [kind]: prev[kind].filter((_, i) => i !== idx),
    }));
  }

  function saveCards() {
    const cleaned: RewardCards = {
      rewards: cards.rewards
        .map((x) => x.trim())
        .filter(Boolean),
      penalties: cards.penalties
        .map((x) => x.trim())
        .filter(Boolean),
    };
    saveRewardCards(cleaned);
    setCards(cleaned);
    setMsg("已保存");
    window.setTimeout(() => setMsg(""), 1500);
  }

  function resetCardsClick() {
    if (!window.confirm("恢复默认奖惩卡池？")) return;
    resetRewardCards();
    setCards(loadRewardCards());
  }

  function resetStatsClick() {
    if (
      !window.confirm(
        "清空所有战绩？\n\n五子棋/井字棋/UNO 的胜负都会归零。"
      )
    )
      return;
    resetAllArcadeStats();
    reload();
    setMsg("已清空");
    window.setTimeout(() => setMsg(""), 1500);
  }

  return (
    <div className="gm-panel-backdrop" onClick={onClose}>
      <div
        className="gm-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "90vh" }}
      >
        <div className="gm-panel-head">
          <span>战绩与奖惩</span>
          <button
            className="gh-icon-btn"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        <div className="arp-tabs">
          <button
            className={"arp-tab" + (tab === "record" ? " is-on" : "")}
            onClick={() => setTab("record")}
          >
            战绩
          </button>
          <button
            className={"arp-tab" + (tab === "rewards" ? " is-on" : "")}
            onClick={() => setTab("rewards")}
          >
            奖励卡
            <span className="arp-tab-count">
              {cards.rewards.length}
            </span>
          </button>
          <button
            className={"arp-tab" + (tab === "penalties" ? " is-on" : "")}
            onClick={() => setTab("penalties")}
          >
            惩罚卡
            <span className="arp-tab-count">
              {cards.penalties.length}
            </span>
          </button>
        </div>

        <div className="gm-panel-body">
          {tab === "record" && (
            <>
              <div className="arp-record-head">
                <div className="arp-record-hint">
                  点「编辑」可手动改任何数字（编点离谱战绩留念）
                </div>
                <button
                  className={"arp-edit-btn" + (editing ? " is-on" : "")}
                  onClick={() => setEditing((v) => !v)}
                >
                  {editing ? (
                    <>
                      <Check size={13} strokeWidth={2.4} />
                      完成
                    </>
                  ) : (
                    <>
                      <Pencil size={13} strokeWidth={2.4} />
                      编辑
                    </>
                  )}
                </button>
              </div>

              {stats.map((g) => (
                <div key={g.key} className="arp-game">
                  <div className="arp-game-head">
                    <span className="arp-game-icon">{g.icon}</span>
                    <span className="arp-game-name">{g.label}</span>
                    <span className="arp-game-total">
                      共 {g.total} 局
                    </span>
                  </div>
                  <div className="arp-table">
                    <div className="arp-th">玩家</div>
                    <div className="arp-th">胜</div>
                    <div className="arp-th">负</div>
                    {g.key !== "uno" && <div className="arp-th">平</div>}
                    {g.rows.map((r) => (
                      <Row
                        key={r.who}
                        game={g.key}
                        row={r}
                        editing={editing}
                        onChange={setStat}
                        showDraws={g.key !== "uno"}
                      />
                    ))}
                  </div>
                </div>
              ))}

              <button
                className="arp-reset"
                onClick={resetStatsClick}
              >
                <RotateCcw size={13} strokeWidth={2.4} />
                清空所有战绩
              </button>
            </>
          )}

          {(tab === "rewards" || tab === "penalties") && (
            <>
              <div className="arp-cards-head">
                <div className="arp-cards-hint">
                  {tab === "rewards"
                    ? "你赢了时，从这里随机抽一张"
                    : "你输了时，从这里随机抽一张"}
                </div>
                <button
                  className="arp-small-btn"
                  onClick={resetCardsClick}
                >
                  <RotateCcw size={12} strokeWidth={2.4} />
                  恢复默认
                </button>
              </div>

              <div className="arp-cards">
                {cards[tab].length === 0 && (
                  <div className="gm-panel-empty">
                    还没有卡片，点下方添加
                  </div>
                )}
                {cards[tab].map((c, i) => (
                  <div key={i} className="arp-card-row">
                    <span className="arp-card-icon">
                      {tab === "rewards" ? (
                        <Sparkles size={13} strokeWidth={2} />
                      ) : (
                        <Skull size={13} strokeWidth={2} />
                      )}
                    </span>
                    <input
                      className="gm-chat-text"
                      value={c}
                      onChange={(e) =>
                        setCardText(tab, i, e.target.value)
                      }
                      placeholder="写一句奖惩内容…"
                    />
                    <button
                      className="gcp-line-del"
                      onClick={() => removeCard(tab, i)}
                      aria-label="删除"
                    >
                      <Trash2 size={14} strokeWidth={2.2} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                className="gcp-add"
                onClick={() => addCard(tab)}
                style={{ marginTop: 12 }}
              >
                <Plus size={14} strokeWidth={2.4} />
                添加一张
              </button>
            </>
          )}

          {msg && <div className="arp-msg">{msg}</div>}
        </div>

        <div className="gm-panel-foot">
          {tab === "record" ? (
            <button
              className="gm-dialog-btn primary"
              onClick={onClose}
              style={{ flex: 1 }}
            >
              完成
            </button>
          ) : (
            <button
              className="gm-dialog-btn primary"
              onClick={saveCards}
              style={{
                flex: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Save size={14} strokeWidth={2.4} />
              保存卡池
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  game,
  row,
  editing,
  onChange,
  showDraws,
}: {
  game: "gomoku" | "tictactoe" | "uno";
  row: { who: ArcadePlayer; wins: number; losses: number; draws: number };
  editing: boolean;
  onChange: (
    game: "gomoku" | "tictactoe" | "uno",
    who: ArcadePlayer,
    field: "wins" | "losses" | "draws",
    value: number
  ) => void;
  showDraws: boolean;
}) {
  return (
    <>
      <div className="arp-td arp-td-name">{PLAYER_LABEL[row.who]}</div>
      <Cell
        value={row.wins}
        editing={editing}
        onChange={(v) => onChange(game, row.who, "wins", v)}
      />
      <Cell
        value={row.losses}
        editing={editing}
        onChange={(v) => onChange(game, row.who, "losses", v)}
      />
      {showDraws && (
        <Cell
          value={row.draws}
          editing={editing}
          onChange={(v) => onChange(game, row.who, "draws", v)}
        />
      )}
    </>
  );
}

function Cell({
  value,
  editing,
  onChange,
}: {
  value: number;
  editing: boolean;
  onChange: (v: number) => void;
}) {
  if (!editing) return <div className="arp-td">{value}</div>;
  return (
    <div className="arp-td">
      <input
        type="number"
        className="arp-cell-input"
        value={value}
        min={0}
        onChange={(e) =>
          onChange(Math.max(0, parseInt(e.target.value) || 0))
        }
      />
    </div>
  );
}