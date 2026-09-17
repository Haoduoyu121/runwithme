"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  nextMastery,
  pickCheerInterval,
  pickRandomEnabled,
  type SessionPartner,
  type StudyCheerCard,
  type StudyMode,
  type StudySessionKind,
  type StudySettings,
  type Word,
  type WordBook,
} from "@/data/study";

import {
  playWord,
  stopCurrentAudio,
} from "@/lib/studyAudio";

import { loadCheerCards } from "@/lib/studyStorage";

import CheerBubble from "@/components/apps/study/CheerBubble";

import FlashcardMode from "@/components/apps/study/FlashcardMode";
import SpellingMode from "@/components/apps/study/SpellingMode";
import MatchingMode from "@/components/apps/study/MatchingMode";

type Props = {
  kind: StudySessionKind;
  partner: SessionPartner;
  book: WordBook;
  words: Word[];
  sessionWordIds: string[];
  settings: StudySettings;
  onExit: () => void;
  onRestart: () => void;
  onUpdateWord: (wordId: string, patch: Partial<Word>) => void;
  onRecordStudy: (
    wordIds: string[],
    correct: boolean
  ) => void;
  /* 错题集 */
  onAddMistake: (wordId: string) => void;
  onRemoveMistake: (wordId: string) => void;
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
  kind,
  partner,
  book,
  words,
  sessionWordIds,
  settings,
  onExit,
  onRestart,
  onUpdateWord,
  onRecordStudy,
  onAddMistake,
  onRemoveMistake,
}: Props) {
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<StudyMode>("card");
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [batchIndex, setBatchIndex] = useState(0);

  /* 鼓励气泡 */
  const [cheerBubble, setCheerBubble] =
    useState<StudyCheerCard | null>(null);
  const cheerCounterRef = useRef(0);
  const cheerNextAtRef = useRef(
    pickCheerInterval(settings.cheerFrequency)
  );

  const currentId = sessionWordIds[index];
  const current = useMemo(
    () => words.find((w) => w.id === currentId) ?? null,
    [words, currentId]
  );

  const total = sessionWordIds.length;

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

  /* ---------- 卸载时停止音频 ---------- */

  useEffect(() => {
    return () => stopCurrentAudio();
  }, []);

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

    /* ---------- 鼓励气泡计数 ---------- */

  function recordStudied(count: number) {
    if (finished) return;
    cheerCounterRef.current += count;

    if (
      cheerCounterRef.current >= cheerNextAtRef.current
    ) {
      cheerCounterRef.current = 0;
      cheerNextAtRef.current = pickCheerInterval(
        settings.cheerFrequency
      );

      const cards = loadCheerCards();
      const card = pickRandomEnabled(cards);
      if (card) setCheerBubble(card);
    }
  }

  /* ---------- 导航 ---------- */

  function goPrev() {
    if (index <= 0) return;
    stopCurrentAudio();
    setIndex(index - 1);
  }

  /* ---------- 判定 ---------- */

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

    onRecordStudy([current.id], correct);
    recordStudied(1);

    /* 错题集逻辑 */
    if (correct) {
      if (kind === "mistakes") {
        onRemoveMistake(current.id);
      }
    } else {
      onAddMistake(current.id);
    }

    if (index < total - 1) {
      setIndex(index + 1);
    } else {
      setFinished(true);
    }
  }

  /* ---------- 连连看完成一批 ---------- */

  function handleBatchComplete(wrong: number) {
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

      /* 错题集逻辑 */
      if (correct) {
        if (kind === "mistakes") {
          onRemoveMistake(id);
        }
      } else {
        onAddMistake(id);
      }
    }

    onRecordStudy(currentBatchIds, correct);
    recordStudied(currentBatchIds.length);

    if (batchIndex < batches.length - 1) {
      setBatchIndex(batchIndex + 1);
    } else {
      setFinished(true);
    }
  }

  /* ---------- 完成弹窗 ---------- */

  function handleContinue() {
    setFinished(false);
    setIndex(0);
    setBatchIndex(0);
    setMode("card");
    stopCurrentAudio();
    onRestart();
  }

  function handleLater() {
    setFinished(false);
    stopCurrentAudio();
    onExit();
  }

  /* ---------- 空状态 ---------- */

  if (!current && !finished) {
    return (
      <div className="study-scroll">
        <div className="study-empty">
          <div className="study-empty-icon">∅</div>
          <div className="study-empty-title">
            {kind === "mistakes"
              ? "错题集是空的"
              : "这本词书里没有单词"}
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

  const sessionLabel =
    kind === "mistakes"
      ? `错题集 · ${PARTNER_LABELS[partner]}`
      : `${PARTNER_LABELS[partner]} · ${book.name}`;

  return (
    <div className="study-session">
      <div className="study-session-topbar">
        <button
          className="study-session-exit"
          onClick={() => {
            stopCurrentAudio();
            onExit();
          }}
          aria-label="退出"
          type="button"
        >
          ✕
        </button>
        <div className="study-session-title">
          {sessionLabel}
        </div>
        <div className="study-session-progress-text">
          {progressText}
        </div>
      </div>

      <div className="study-session-progress-bar">
        <div
          className="study-session-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

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

              {/* 鼓励气泡（完成弹窗时不显示） */}
      {cheerBubble && !finished && (
        <CheerBubble
          card={cheerBubble}
          onDone={() => setCheerBubble(null)}
        />
      )}

      {finished && (
        <div className="study-modal-backdrop">
          <div className="study-modal study-finish-modal">
            <div className="study-finish-icon">✓</div>
            <div className="study-finish-title">
              {kind === "mistakes"
                ? "错题练完了"
                : "这一轮学完了"}
            </div>
            <div className="study-finish-desc">
              {kind === "mistakes"
                ? `这一轮过了 ${total} 个错题。要不要再来一遍？`
                : `已经过了一遍 ${total} 个单词。要不要继续？`}
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