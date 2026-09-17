"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { Word, WordBook, StudySettings } from "@/data/study";

import WordFormModal from "@/components/apps/study/WordFormModal";

import { playWord, stopCurrentAudio } from "@/lib/studyAudio";
import { loadStudySettings } from "@/lib/studyStorage";

type Props = {
  book: WordBook;
  words: Word[];
  onBack: () => void;
  onAddWord: (
    text: string,
    meaning: string,
    example: string
  ) => void;
  onUpdateWord: (
    wordId: string,
    text: string,
    meaning: string,
    example: string
  ) => void;
  onDeleteWord: (wordId: string) => void;
};

export default function BookDetail({
  book,
  words,
  onBack,
  onAddWord,
  onUpdateWord,
  onDeleteWord,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingWord, setEditingWord] =
    useState<Word | null>(null);
  const [search, setSearch] = useState("");

  /* 发音 */
  const [settings, setSettings] =
    useState<StudySettings | null>(null);
  const [playingWordId, setPlayingWordId] = useState<
    string | null
  >(null);
  const playTokenRef = useRef(0);

  useEffect(() => {
    setSettings(loadStudySettings());
  }, []);

  /* 卸载时停止播放 */
  useEffect(() => {
    return () => {
      playTokenRef.current++;
      stopCurrentAudio();
    };
  }, []);

   function handlePlay(word: Word) {
    if (!settings) return;

    if (playingWordId === word.id) {
      stopCurrentAudio();
      setPlayingWordId(null);
      return;
    }

    setPlayingWordId(word.id);

    playWord({
      word: word.text,
      voice: settings.defaultVoice,
      source: settings.audioSource,
      ttsRate: settings.ttsRate,
      ttsVoiceName: settings.ttsVoiceName,
    });

    /* 大约 1.5 秒后自动复位按钮状态（TTS 没有可靠的回调） */
    window.setTimeout(() => {
      setPlayingWordId((prev) =>
        prev === word.id ? null : prev
      );
    }, 1500);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...words].sort(
      (a, b) => b.createdAt - a.createdAt
    );
    if (!q) return sorted;
    return sorted.filter(
      (w) =>
        w.text.toLowerCase().includes(q) ||
        w.meaning.toLowerCase().includes(q)
    );
  }, [words, search]);

  function handleDelete(w: Word) {
    if (!window.confirm(`删除「${w.text}」？`)) return;
    onDeleteWord(w.id);
  }

  return (
    <>
      <header className="study-subheader">
        <button
          className="study-back"
          onClick={onBack}
          aria-label="返回"
        >
          ‹
        </button>

        <div className="study-header-center">
          <div className="study-header-title">
            {book.name}
          </div>
          <div className="study-header-sub">
            {words.length} words
            {book.description
              ? ` · ${book.description}`
              : ""}
          </div>
        </div>

        <button
          className="study-subheader-add"
          onClick={() => {
            setEditingWord(null);
            setShowForm(true);
          }}
          aria-label="添加单词"
        >
          ＋
        </button>
      </header>

      <div className="study-scroll">
        {words.length > 0 && (
          <div className="study-search-wrap">
            <input
              type="text"
              className="study-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索单词或释义…"
            />
          </div>
        )}

        {words.length === 0 ? (
          <div className="study-empty">
            <div className="study-empty-icon">✎</div>
            <div className="study-empty-title">
              还没有单词
            </div>
            <div className="study-empty-desc">
              点右上角 ＋ 添加第一个
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="study-empty">
            <div className="study-empty-icon">∅</div>
            <div className="study-empty-title">
              没找到匹配的单词
            </div>
          </div>
        ) : (
          <ul className="study-word-list">
            {filtered.map((w) => (
              <li key={w.id} className="study-word-item">
                <div className="study-word-body">
                  <div className="study-word-text">
                    {w.text}
                    <span
                      className={`study-word-mastery study-word-mastery-${w.mastery}`}
                    >
                      {w.mastery === "mastered"
                        ? "已掌握"
                        : w.mastery === "learning"
                          ? "学习中"
                          : "新词"}
                    </span>
                  </div>
                  <div className="study-word-meaning">
                    {w.meaning}
                  </div>
                  {w.example && (
                    <div className="study-word-example">
                      {w.example}
                    </div>
                  )}
                </div>

                <div className="study-word-actions">
                  <button
                    className={`study-word-action study-word-play${
                      playingWordId === w.id
                        ? " is-playing"
                        : ""
                    }`}
                    onClick={() => handlePlay(w)}
                    aria-label={
                      playingWordId === w.id
                        ? "停止"
                        : "播放发音"
                    }
                  >
                    {playingWordId === w.id ? "❚❚" : "▶"}
                  </button>
                  <button
                    className="study-word-action"
                    onClick={() => {
                      setEditingWord(w);
                      setShowForm(true);
                    }}
                    aria-label="编辑"
                  >
                    ✎
                  </button>
                  <button
                    className="study-word-action danger"
                    onClick={() => handleDelete(w)}
                    aria-label="删除"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showForm && (
        <WordFormModal
          initial={editingWord}
          onClose={() => {
            setShowForm(false);
            setEditingWord(null);
          }}
          onConfirm={(text, meaning, example) => {
            if (editingWord) {
              onUpdateWord(
                editingWord.id,
                text,
                meaning,
                example
              );
            } else {
              onAddWord(text, meaning, example);
            }
          }}
        />
      )}
    </>
  );
}