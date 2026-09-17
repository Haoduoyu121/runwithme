"use client";

import { useMemo, useState } from "react";

import {
  nextMastery,
  type SessionPartner,
  type StudyMode,
  type StudySettings,
  type Word,
  type WordBook,
} from "@/data/study";

import {
  playWord,
  stopCurrentAudio,
} from "@/lib/studyAudio";

import FlashcardMode from "@/components/apps/study/FlashcardMode";
import SpellingMode from "@/components/apps/study/SpellingMode";
import MatchingMode from "@/components/apps/study/MatchingMode";

type Props = {
  partner: SessionPartner;
  book: WordBook;
  words: Word[];
  sessionWordIds: string[];
  settings: StudySettings;
  onExit: () => void;
  onRestart: () => void;
  onUpdateWord: (wordId: string, patch: Partial<Word>) => void;
};

const PARTNER_LABELS: Record<SessionPartner, string> = {
  levi: "和 Levi 一起",
  erwin: "和 Erwin 一起",
  both: "一起学习",
};

const MODES: {
  key: StudyMode;
  label: string;
  icon: string;
}[] = [
  { key: "card", label: "卡片", icon: "❏" },
  { key: "spell", label: "拼写", icon: "✎" },
  { key: "match", label: "连连看", icon: "⊞" },
];

export default function StudySession({
  partner,
  book,
  words,
  sessionWordIds,
  settings,
  onExit,
  onRestart,
  onUpdateWord,
}: Props) {
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<StudyMode>("card");
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);

  /* 连连看专用：批索引 */
  const [batchIndex, setBatchIndex] = useState(0);

  /* 卡片/拼写模式当前词 */
  const currentId = sessionWordIds[index];
  const current = useMemo(
    () => words.find((w) => w.id === currentId) ?? null,
    [words, currentId]
  );

  const total = sessionWordIds.length;

  /* 连连看批次 */
  const batches = useMemo(() => {
    const result: string[][] = [];
    for (let i = 0; i < sessionWordIds.length; i += 4) {
      result.push(sessionWordIds.slice(i, i + 4));
    }
    return result;
  }, [sessionWordIds]);

  const currentBatchIds = batches[batchIndex] ?? [];
  const currentBatchWords = useMemo(
    () =>
      currentBatchIds
        .map((id) => words.find((w) => w.id === id))
        .filter((w): w is Word => !!w),
    [currentBatchIds, words]
  );

  /* ---------- 播放 ---------- */

  function pickVoice(): "levi" | "erwin" {
    if (partner === "levi") return "levi";
    if (partner === "erwin") return "erwin";
    return Math.random() < 0.5 ? "levi" : "erwin";
  }

  function handlePlay() {
    if (!current) return;
    setPlaying(true);

    playWord({
      word: current.text,
      voice: pickVoice(),
      source: settings.audioSource,
      ttsRate: settings.ttsRate,
      ttsVoiceName: settings.ttsVoiceName,
    });

    window.setTimeout(() => setPlaying(false), 1500);
  }

  /* ---------- 导航 ---------- */

  function goPrev() {
    if (index <= 0) return;
    stopCurrentAudio();
    setIndex(index - 1);
  }

  /* ---------- 单个词判定（卡片 / 拼写模式） ---------- */

  function applyResult(correct: boolean) {
    if (!current) return;

    const { mastery, correctCount } = nextMastery(
      current.mastery,
      current.correctCount,
      correct
    );

    onUpdateWord(current.id, {
      mastery,
      correctCount,
      wrongCount: current.wrongCount + (correct ? 0 : 1),
      lastReviewedAt: Date.now(),
    });

    if (index < total - 1) {
      setIndex(index + 1);
    } else {
      setFinished(true);
    }
  }

  /* ---------- 连连看：一批完成 ---------- */

  function handleBatchComplete(wrong: number) {
    /* 一批里错误 0 次 → 全批算对；否则算错 */
    const correct = wrong === 0;

    for (const id of currentBatchIds) {
      const w = words.find((x) => x.id === id);
      if (!w) continue;

      const { mastery, correctCount } = nextMastery(
        w.mastery,
        w.correctCount,
        correct
      );

      onUpdateWord(id, {
        mastery,
        correctCount,
        wrongCount: w.wrongCount + (correct ? 0 : 1),
        lastReviewedAt: Date.now(),
      });
    }

    if (batchIndex < batches.length - 1) {
      setBatchIndex(batchIndex + 1);
    } else {
      setFinished(true);
    }
  }

  /* ---------- 完成弹窗按钮 ---------- */

  function handleContinue() {
    setFinished(false);
    setIndex(0);
    setBatchIndex(0);
    onRestart();
  }

  function handleLater() {
    setFinished(false);
    onExit();
  }

  /* ---------- 空状态 ---------- */

  if (!current && !finished) {
    return (
      <div className="study-scroll">
        <div className="study-empty">
          <div className="study-empty-icon">∅</div>
          <div className="study-empty-title">
            这本词书里没有单词
          </div>
        </div>
        <div className="study-session-empty-actions">
          <button
            className="study-btn ghost"
            onClick={onExit}
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  /* ---------- 进度 ---------- */

  const isMatching = mode === "match";

  const progress = isMatching
    ? batches.length > 0
      ? ((batchIndex + 1) / batches.length) * 100
      : 0
    : total > 0
      ? ((index + 1) / total) * 100
      : 0;

  const progressText = isMatching
    ? batches.length > 0
      ? `${batchIndex + 1} / ${batches.length} 组`
      : "0 组"
    : `${index + 1} / ${total}`;

  return (
    <div className="study-session">
      {/* 顶部栏 */}
      <div className="study-session-topbar">
        <button
          className="study-session-exit"
          onClick={onExit}
          aria-label="退出"
          type="button"
        >
          ✕
        </button>
        <div className="study-session-title">
          {PARTNER_LABELS[partner]} · {book.name}
        </div>
        <div className="study-session-progress-text">
          {progressText}
        </div>
      </div>

      {/* 进度条 */}
      <div className="study-session-progress-bar">
        <div
          className="study-session-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 模式切换 */}
      <div className="study-mode-segment">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            className={mode === m.key ? "active" : ""}
            onClick={() => {
              stopCurrentAudio();
              setMode(m.key);
            }}
          >
            <span className="study-mode-segment-icon">
              {m.icon}
            </span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* 内容 */}
      {current && mode === "card" && (
        <FlashcardMode
          word={current}
          playing={playing}
          onPlay={handlePlay}
          onKnown={() => applyResult(true)}
          onUnknown={() => applyResult(false)}
          canPrev={index > 0}
          onPrev={goPrev}
        />
      )}

      {current && mode === "spell" && (
        <SpellingMode
          word={current}
          playing={playing}
          onPlay={handlePlay}
          onResult={applyResult}
        />
      )}

      {isMatching && currentBatchWords.length > 0 && (
        <MatchingMode
          key={batchIndex}
          words={currentBatchWords}
          onBatchComplete={handleBatchComplete}
        />
      )}

      {/* 完成弹窗 */}
      {finished && (
        <div className="study-modal-backdrop">
          <div className="study-modal study-finish-modal">
            <div className="study-finish-icon">✓</div>
            <div className="study-finish-title">
              这一轮学完了
            </div>
            <div className="study-finish-desc">
              已经过了一遍 {total} 个单词。要不要继续？
            </div>

            <div className="study-finish-actions">
              <button
                className="study-finish-later"
                onClick={handleLater}
              >
                下次再来
              </button>
              <button
                className="study-finish-continue"
                onClick={handleContinue}
              >
                继续
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}