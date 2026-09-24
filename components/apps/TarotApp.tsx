"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  History,
  Shuffle,
  Sparkles,
  Trash2,
  ChevronLeft,
  Moon,
  BookOpen,
} from "lucide-react";
import {
  DEFAULT_TAROT_DECK,
  DEFAULT_DECK_ID,
  DEFAULT_DECK_NAME,
  cardImagePath,
  getCardById,
  type TarotCard,
} from "@/data/tarot";
import {
  listRecords,
  addRecord,
  updateRecord,
  deleteRecord,
  drawRandom,
  randomReversed,
  shuffle,
  type TarotRecord,
  type DrawnCard,
  type TarotMode,
} from "@/lib/tarotStorage";
import AiReadingPanel from "./tarot/AiReadingPanel";
import type { ReadingCardRef } from "@/lib/tarotReading";

type Props = { onBack: () => void };

type View =
  | { kind: "home" }
  | { kind: "setup"; mode: TarotMode }
  | {
      kind: "pick";
      mode: TarotMode;
      asker: "" | "levi" | "erwin";
      question: string;
      count: number;
    }
  | {
      kind: "reveal";
      mode: TarotMode;
      asker: "" | "levi" | "erwin";
      question: string;
      cards: DrawnCard[];
      recordId: string;
      aiReading?: string;
    }
  | { kind: "history" }
  | { kind: "record"; id: string };

const MODE_LABEL: Record<TarotMode, string> = {
  today: "今日一牌",
  three: "三牌阵",
  custom: "自定义牌阵",
};

const MODE_COUNT: Record<TarotMode, number> = {
  today: 1,
  three: 3,
  custom: 5,
};

const THREE_POS = ["过去", "现在", "未来"];

export default function TarotApp({ onBack }: Props) {
  const [view, setView] = useState<View>({ kind: "home" });
  const [records, setRecords] = useState<TarotRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showAi, setShowAi] = useState(false);

  const refresh = useCallback(async () => {
    const list = await listRecords();
    setRecords(list);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /* 给 AI 解读用的牌引用 */
  function cardsToRefs(
    cards: DrawnCard[],
    mode: TarotMode
  ): ReadingCardRef[] {
    return cards.map((dc, i) => {
      const c = getCardById(dc.cardId);
      return {
        nameCn: c?.nameCn || "",
        name: c?.name || "",
        reversed: dc.reversed,
        upright: c?.upright || "",
        reversedText: c?.reversed || "",
        position:
          mode === "three"
            ? THREE_POS[i]
            : mode === "today"
              ? "今日"
              : `牌 ${i + 1}`,
      };
    });
  }

  return (
    <div className="tarot-app">
      <header className="tarot-topbar">
        <button
          className="tarot-icon-btn"
          onClick={() => {
            if (view.kind === "home") onBack();
            else setView({ kind: "home" });
          }}
          aria-label="返回"
        >
          <ChevronLeft size={22} strokeWidth={2.2} />
        </button>
        <div className="tarot-title">
          {view.kind === "home" && "占卜之书"}
          {view.kind === "setup" && MODE_LABEL[view.mode]}
          {view.kind === "pick" && "选牌"}
          {view.kind === "reveal" && MODE_LABEL[view.mode]}
          {view.kind === "history" && "记录"}
          {view.kind === "record" && "记录"}
        </div>
        <div className="tarot-topbar-right">
          {view.kind === "home" && (
            <button
              className="tarot-icon-btn"
              onClick={() => setView({ kind: "history" })}
              aria-label="记录"
            >
              <History size={18} strokeWidth={2.2} />
            </button>
          )}
        </div>
      </header>

      <main className="tarot-content">
        {view.kind === "home" && (
          <HomeView onPick={(m) => setView({ kind: "setup", mode: m })} />
        )}

        {view.kind === "setup" && (
          <SetupView
            mode={view.mode}
            onStart={(asker, question, count) =>
              setView({
                kind: "pick",
                mode: view.mode,
                asker,
                question,
                count,
              })
            }
          />
        )}

        {view.kind === "pick" && (
          <PickView
            count={view.count}
            onDone={async (finalCards) => {
              const rec = await addRecord({
                deckId: DEFAULT_DECK_ID,
                mode: view.mode,
                asker: view.asker,
                question: view.question,
                cards: finalCards,
              });
              await refresh();
              setView({
                kind: "reveal",
                mode: view.mode,
                asker: view.asker,
                question: view.question,
                cards: finalCards,
                recordId: rec.id,
              });
            }}
          />
        )}

        {view.kind === "reveal" && (
          <RevealView
            mode={view.mode}
            asker={view.asker}
            question={view.question}
            cards={view.cards}
            aiReading={view.aiReading}
            onRequestAi={() => setShowAi(true)}
          />
        )}

        {view.kind === "history" && (
          <HistoryView
            records={records}
            loaded={loaded}
            onOpen={(id) => setView({ kind: "record", id })}
          />
        )}

        {view.kind === "record" && (
          <RecordDetailView
            record={records.find((r) => r.id === view.id) || null}
            onDelete={async (id) => {
              await deleteRecord(id);
              await refresh();
              setView({ kind: "history" });
            }}
          />
        )}
      </main>

      {showAi && view.kind === "reveal" && (
        <AiReadingPanel
          question={view.question}
          cards={cardsToRefs(view.cards, view.mode)}
          initialReading={view.aiReading}
          onClose={() => setShowAi(false)}
          onReading={async (text) => {
            await updateRecord(view.recordId, {
              aiReading: text,
            });
            await refresh();
            setView({ ...view, aiReading: text });
          }}
        />
      )}
    </div>
  );
}

/* =========================================================
   Home
   ========================================================= */

function HomeView({ onPick }: { onPick: (m: TarotMode) => void }) {
  return (
    <div className="tarot-home">
      <div className="tarot-home-glow" />

      <div className="tarot-home-head">
        <Moon size={28} strokeWidth={1.6} className="tarot-home-moon" />
        <div className="tarot-home-title">Tarot</div>
        <div className="tarot-home-sub">翻开你的下一页</div>
      </div>

      <div className="tarot-mode-grid">
        <button className="tarot-mode-card" onClick={() => onPick("today")}>
          <div className="tarot-mode-symbol">☀</div>
          <div className="tarot-mode-name">今日一牌</div>
          <div className="tarot-mode-desc">抽一张，看今天</div>
        </button>

        <button className="tarot-mode-card" onClick={() => onPick("three")}>
          <div className="tarot-mode-symbol">❖</div>
          <div className="tarot-mode-name">三牌阵</div>
          <div className="tarot-mode-desc">过去 · 现在 · 未来</div>
        </button>

        <button className="tarot-mode-card" onClick={() => onPick("custom")}>
          <div className="tarot-mode-symbol">✦</div>
          <div className="tarot-mode-name">自定义</div>
          <div className="tarot-mode-desc">自由牌阵</div>
        </button>
      </div>

      <div className="tarot-home-deck">
        <div className="tarot-deck-name">{DEFAULT_DECK_NAME}</div>
        <div className="tarot-deck-count">78 张 · 全部可用</div>
      </div>
    </div>
  );
}

/* =========================================================
   Setup
   ========================================================= */

function SetupView({
  mode,
  onStart,
}: {
  mode: TarotMode;
  onStart: (
    asker: "" | "levi" | "erwin",
    question: string,
    count: number
  ) => void;
}) {
  const [asker, setAsker] = useState<"" | "levi" | "erwin">("");
  const [question, setQuestion] = useState("");
  const [count, setCount] = useState(MODE_COUNT[mode]);

  function start() {
    onStart(asker, question.trim(), count);
  }

  return (
    <div className="tarot-setup">
      <div className="tarot-field">
        <label className="tarot-field-label">问谁</label>
        <div className="tarot-asker-row">
          <button
            className={"tarot-asker" + (asker === "" ? " is-on" : "")}
            onClick={() => setAsker("")}
          >
            <span className="tarot-asker-symbol">☾</span>
            <span>自己抽</span>
          </button>
          <button
            className={"tarot-asker" + (asker === "levi" ? " is-on" : "")}
            onClick={() => setAsker("levi")}
          >
            <span className="tarot-asker-symbol">L</span>
            <span>Levi</span>
          </button>
          <button
            className={"tarot-asker" + (asker === "erwin" ? " is-on" : "")}
            onClick={() => setAsker("erwin")}
          >
            <span className="tarot-asker-symbol">E</span>
            <span>Erwin</span>
          </button>
        </div>
      </div>

      <div className="tarot-field">
        <label className="tarot-field-label">你想问什么</label>
        <textarea
          className="tarot-input tarot-textarea"
          rows={3}
          placeholder="可以留空，只是随便抽抽"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </div>

      {mode === "custom" && (
        <div className="tarot-field">
          <label className="tarot-field-label">抽几张</label>
          <div className="tarot-count-row">
            {[3, 5, 7, 9].map((n) => (
              <button
                key={n}
                className={"tarot-count" + (count === n ? " is-on" : "")}
                onClick={() => setCount(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      <button className="tarot-primary" onClick={start}>
        <Shuffle size={16} strokeWidth={2.4} />
        开始洗牌
      </button>
    </div>
  );
}

/* =========================================================
   Pick - 洗牌动画 → 展开全部 78 张 → 用户选牌
   ========================================================= */

function PickView({
  count,
  onDone,
}: {
  count: number;
  onDone: (cards: DrawnCard[]) => void;
}) {
  const [phase, setPhase] = useState<"shuffle" | "picking">("shuffle");
  const [picked, setPicked] = useState<DrawnCard[]>([]);

  /* 整副牌随机排序（洗牌结果），只算一次 */
  const deck = useMemo(
    () => shuffle(DEFAULT_TAROT_DECK),
    []
  );

  useEffect(() => {
    const t = window.setTimeout(() => setPhase("picking"), 1500);
    return () => window.clearTimeout(t);
  }, []);

  const pickedIds = useMemo(
    () => new Set(picked.map((p) => p.cardId)),
    [picked]
  );

  function togglePick(c: TarotCard) {
    if (pickedIds.has(c.id)) {
      /* 取消选择 */
      setPicked((prev) =>
        prev.filter((p) => p.cardId !== c.id)
      );
      return;
    }
    if (picked.length >= count) return;
    const next = [
      ...picked,
      { cardId: c.id, reversed: randomReversed() },
    ];
    setPicked(next);
    if (next.length >= count) {
      /* 选满自动进入 */
      window.setTimeout(() => onDone(next), 420);
    }
  }

  function randomFill() {
    const need = count - picked.length;
    if (need <= 0) return;
    const remaining = deck.filter(
      (c) => !pickedIds.has(c.id)
    );
    const extra = drawRandom(remaining, need).map((c) => ({
      cardId: c.id,
      reversed: randomReversed(),
    }));
    const next = [...picked, ...extra].slice(0, count);
    setPicked(next);
    window.setTimeout(() => onDone(next), 420);
  }

  if (phase === "shuffle") {
    return (
      <div className="tarot-shuffle">
        <div className="tarot-shuffle-deck">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="tarot-shuffle-card is-flying"
              style={{
                ["--i" as string]: i,
                ["--dir" as string]: i % 2 === 0 ? 1 : -1,
              }}
            />
          ))}
        </div>
        <div className="tarot-shuffle-text">洗牌中…</div>
      </div>
    );
  }

  const remain = count - picked.length;

  return (
    <div className="tarot-pick">
      <div className="tarot-pick-bar">
        <div className="tarot-pick-bar-left">
          已选 <strong>{picked.length}</strong> / {count}
        </div>
        <button
          className="tarot-pick-random"
          onClick={randomFill}
          disabled={remain <= 0}
        >
          随机补 {remain} 张
        </button>
      </div>

      <div className="tarot-pick-hint">
        {remain > 0
          ? "从牌堆中挑选，凭感觉"
          : "已选满，正在展开…"}
      </div>

      <div className="tarot-pick-grid">
        {deck.map((c) => {
          const on = pickedIds.has(c.id);
          const disabled = !on && picked.length >= count;
          return (
            <button
              key={c.id}
              className={
                "tarot-pick-card" +
                (on ? " is-on" : "") +
                (disabled ? " is-disabled" : "")
              }
              onClick={() => togglePick(c)}
              aria-label={c.nameCn}
            >
              <span className="tarot-pick-glyph">✦</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
   Reveal
   ========================================================= */

function RevealView({
  mode,
  asker,
  question,
  cards,
  aiReading,
  onRequestAi,
}: {
  mode: TarotMode;
  asker: "" | "levi" | "erwin";
  question: string;
  cards: DrawnCard[];
  aiReading?: string;
  onRequestAi: () => void;
}) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const allRevealed = revealed.size >= cards.length;

  function reveal(i: number) {
    setRevealed((prev) => {
      const n = new Set(prev);
      n.add(i);
      return n;
    });
  }

  function revealAll() {
    setRevealed(new Set(cards.map((_, i) => i)));
  }

  const askerLabel =
    asker === "" ? null : asker === "levi" ? "Levi" : "Erwin";

  return (
    <div className="tarot-reveal">
      {question && (
        <div className="tarot-reveal-q">
          <span className="tarot-reveal-q-label">问：</span>
          <span>{question}</span>
        </div>
      )}
      {askerLabel && (
        <div className="tarot-reveal-asker">{askerLabel} 与你共卜</div>
      )}

      <div className="tarot-card-row">
        {cards.map((dc, i) => {
          const card = getCardById(dc.cardId);
          if (!card) return null;
          const isOpen = revealed.has(i);
          return (
            <button
              key={i}
              className={
                "tarot-flip" +
                (isOpen ? " is-open" : "") +
                (dc.reversed ? " is-reversed" : "")
              }
              onClick={() => reveal(i)}
            >
              <div className="tarot-flip-inner">
                <div className="tarot-flip-back">
                  <span>✦</span>
                </div>
                <div className="tarot-flip-front">
                  <CardFace card={card} reversed={dc.reversed} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {!allRevealed && (
        <button
          className="tarot-primary tarot-reveal-all"
          onClick={revealAll}
        >
          <Sparkles size={16} strokeWidth={2.2} />
          全部翻开
        </button>
      )}

      {allRevealed && (
        <>
          <div className="tarot-readings">
            {cards.map((dc, i) => {
              const card = getCardById(dc.cardId);
              if (!card) return null;
              const posLabel =
                mode === "three"
                  ? THREE_POS[i] ?? `牌 ${i + 1}`
                  : mode === "today"
                    ? "今日"
                    : `牌 ${i + 1}`;
              return (
                <div key={i} className="tarot-reading-item">
                  <div className="tarot-reading-head">
                    <span className="tarot-reading-pos">{posLabel}</span>
                    <span className="tarot-reading-name">
                      {card.nameCn}
                      <span
                        className={
                          "tarot-pos-tag" +
                          (dc.reversed ? " is-rev" : "")
                        }
                      >
                        {dc.reversed ? "逆位" : "正位"}
                      </span>
                    </span>
                  </div>
                  <div className="tarot-reading-text">
                    {dc.reversed ? card.reversed : card.upright}
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI 解读区 */}
          {aiReading ? (
            <div className="tarot-ai-block">
              <div className="tarot-ai-block-head">
                <BookOpen size={14} strokeWidth={2.2} />
                <span>AI 解读</span>
              </div>
              <div className="tarot-ai-block-text">{aiReading}</div>
              <button
                className="tarot-ai-reopen"
                onClick={onRequestAi}
              >
                重新解读
              </button>
            </div>
          ) : (
            <button
              className="tarot-primary tarot-ai-btn"
              onClick={onRequestAi}
            >
              <Sparkles size={16} strokeWidth={2.2} />
              让 AI 解读
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* =========================================================
   Card Face
   ========================================================= */

function CardFace({
  card,
  reversed,
}: {
  card: TarotCard;
  reversed: boolean;
}) {
  const [imgOk, setImgOk] = useState(true);
  const src = cardImagePath(card.id);

  return (
    <div className="tarot-face">
      {imgOk ? (
        <img
          src={src}
          alt={card.nameCn}
          draggable={false}
          onError={() => setImgOk(false)}
        />
      ) : (
        <div className="tarot-face-symbol">
          <span className="tarot-face-glyph">{card.symbol}</span>
          <span className="tarot-face-name">{card.nameCn}</span>
        </div>
      )}
      {reversed && <div className="tarot-face-rev-tag">逆</div>}
    </div>
  );
}

/* =========================================================
   History
   ========================================================= */

function HistoryView({
  records,
  loaded,
  onOpen,
}: {
  records: TarotRecord[];
  loaded: boolean;
  onOpen: (id: string) => void;
}) {
  if (!loaded) return <div className="tarot-empty">加载中…</div>;
  if (records.length === 0) {
    return (
      <div className="tarot-empty">
        还没有任何占卜记录。
        <br />
        回首页抽一张吧。
      </div>
    );
  }

  return (
    <div className="tarot-history">
      {records.map((r) => (
        <button
          key={r.id}
          className="tarot-history-item"
          onClick={() => onOpen(r.id)}
        >
          <div className="tarot-history-top">
            <span className="tarot-history-mode">{MODE_LABEL[r.mode]}</span>
            <span className="tarot-history-time">
              {new Date(r.ts).toLocaleString("zh-CN", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          {r.question && (
            <div className="tarot-history-q">{r.question}</div>
          )}
          <div className="tarot-history-cards">
            {r.cards.map((dc, i) => {
              const c = getCardById(dc.cardId);
              if (!c) return null;
              return (
                <span key={i} className="tarot-history-chip">
                  {c.nameCn}
                  <span className="tarot-history-chip-rev">
                    {dc.reversed ? "逆" : ""}
                  </span>
                </span>
              );
            })}
          </div>
          {r.aiReading && (
            <div className="tarot-history-ai-tag">✦ 有 AI 解读</div>
          )}
        </button>
      ))}
    </div>
  );
}

/* =========================================================
   Record Detail
   ========================================================= */

function RecordDetailView({
  record,
  onDelete,
}: {
  record: TarotRecord | null;
  onDelete: (id: string) => void;
}) {
  if (!record) return <div className="tarot-empty">记录不存在</div>;

  const askerLabel =
    record.asker === "" ? null : record.asker === "levi" ? "Levi" : "Erwin";

  return (
    <div className="tarot-record">
      <div className="tarot-record-meta">
        <span>{MODE_LABEL[record.mode]}</span>
        <span>·</span>
        <span>{new Date(record.ts).toLocaleString("zh-CN")}</span>
      </div>
      {record.question && (
        <div className="tarot-record-q">「{record.question}」</div>
      )}
      {askerLabel && (
        <div className="tarot-record-asker">{askerLabel} 与你共卜</div>
      )}

      <div className="tarot-record-cards">
        {record.cards.map((dc, i) => {
          const c = getCardById(dc.cardId);
          if (!c) return null;
          return (
            <div key={i} className="tarot-record-card">
              <div className="tarot-record-card-vis">
                <CardFace card={c} reversed={dc.reversed} />
              </div>
              <div className="tarot-record-card-info">
                <div className="tarot-record-card-name">
                  {c.nameCn}
                  <span
                    className={
                      "tarot-pos-tag" + (dc.reversed ? " is-rev" : "")
                    }
                  >
                    {dc.reversed ? "逆位" : "正位"}
                  </span>
                </div>
                <div className="tarot-record-card-text">
                  {dc.reversed ? c.reversed : c.upright}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {record.aiReading && (
        <div className="tarot-ai-block">
          <div className="tarot-ai-block-head">
            <BookOpen size={14} strokeWidth={2.2} />
            <span>AI 解读</span>
          </div>
          <div className="tarot-ai-block-text">
            {record.aiReading}
          </div>
        </div>
      )}

      <button
        className="tarot-danger"
        onClick={() => onDelete(record.id)}
      >
        <Trash2 size={14} strokeWidth={2.4} />
        删除这条记录
      </button>
    </div>
  );
}