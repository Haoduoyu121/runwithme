"use client";

import { useEffect, useState } from "react";

import { BookOpen, Volume2 } from "lucide-react";

import type {
  StudySettings,
  Word,
  WordBook,
} from "@/data/study";

import { loadStudySettings } from "@/lib/studyStorage";
import {
  playWord,
  stopCurrentAudio,
} from "@/lib/studyAudio";

type Props = {
  words: Word[];
  books: WordBook[];
};

const STORAGE_KEY = "runwithme_study_today_word_v1";

type TodayWordState = {
  dateStr: string;
  wordId: string;
};

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function loadToday(): TodayWordState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.dateStr === "string" &&
      typeof parsed.wordId === "string"
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function saveToday(s: TodayWordState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(s)
    );
  } catch (e) {
    console.error("save today word failed:", e);
  }
}

export default function TodayWordCard({
  words,
  books,
}: Props) {
  const [word, setWord] = useState<Word | null>(null);
  const [bookName, setBookName] = useState("");
  const [settings, setSettings] =
    useState<StudySettings | null>(null);
  const [playing, setPlaying] = useState(false);

  /* 选今日单词 */
  useEffect(() => {
    setSettings(loadStudySettings());

    if (words.length === 0) {
      setWord(null);
      return;
    }

    const today = todayStr();
    const cached = loadToday();

    /* 今天已选过 且 词还在 → 用它 */
    if (cached && cached.dateStr === today) {
      const found = words.find(
        (w) => w.id === cached.wordId
      );
      if (found) {
        setWord(found);
        const book = books.find(
          (b) => b.id === found.bookId
        );
        setBookName(book?.name ?? "");
        return;
      }
    }

    /* 否则重新抽 */
    const picked =
      words[Math.floor(Math.random() * words.length)];
    setWord(picked);
    saveToday({ dateStr: today, wordId: picked.id });

    const book = books.find((b) => b.id === picked.bookId);
    setBookName(book?.name ?? "");
  }, [words, books]);

  /* 卸载时停止播放 */
  useEffect(() => {
    return () => {
      stopCurrentAudio();
    };
  }, []);

  function handlePlay() {
    if (!word || !settings) return;

    if (playing) {
      stopCurrentAudio();
      setPlaying(false);
      return;
    }

    setPlaying(true);
    playWord({
      word: word.text,
      voice: settings.defaultVoice,
      source: settings.audioSource,
      ttsRate: settings.ttsRate,
      ttsVoiceName: settings.ttsVoiceName,
    });

    window.setTimeout(() => setPlaying(false), 1500);
  }

  /* ---------- 空状态 ---------- */
  if (!word) {
    return (
      <div className="study-today-word is-empty">
        <div className="study-today-word-label">
          TODAY'S WORD
        </div>

        <div className="study-today-word-empty">
          <BookOpen size={32} strokeWidth={1.4} />
          <p>还没有单词</p>
          <span>
            {books.length === 0
              ? "先去 Library 建一本词书"
              : "往词书里添加一些单词吧"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="study-today-word">
      <div className="study-today-word-head">
        <span className="study-today-word-label">
          TODAY'S WORD
        </span>
        {bookName && (
          <span className="study-today-word-from">
            {bookName}
          </span>
        )}
      </div>

      <div className="study-today-word-main">
        <div className="study-today-word-text">
          {word.text}
        </div>

        <button
          type="button"
          className={`study-today-word-play${
            playing ? " is-playing" : ""
          }`}
          onClick={handlePlay}
          aria-label={playing ? "停止" : "播放发音"}
        >
          <Volume2 size={20} strokeWidth={2} />
        </button>
      </div>

      <div className="study-today-word-meaning">
        {word.meaning}
      </div>

      {word.example && (
        <div className="study-today-word-example">
          {word.example}
        </div>
      )}
    </div>
  );
}