"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  createBookId,
  createWordId,
  type SessionPartner,
  type StudySessionState,
  type StudySettings,
  type Word,
  type WordBook,
} from "@/data/study";

import {
  loadBooks,
  loadStudySettings,
  loadWords,
  saveBooks,
  saveWords,
} from "@/lib/studyStorage";

import BookList from "@/components/apps/study/BookList";
import BookDetail from "@/components/apps/study/BookDetail";
import ImportCSVModal from "@/components/apps/study/ImportCSVModal";
import StudyHome from "@/components/apps/study/StudyHome";
import StudySession from "@/components/apps/study/StudySession";
import StudySettingsPanel from "@/components/apps/study/StudySettingsPanel";

import { initSpeech } from "@/lib/studyAudio";

import type { CsvWordRow } from "@/lib/studyCsv";

type StudyAppProps = {
  onBack: () => void;
};

type Tab = "home" | "library" | "study" | "stats";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "home", label: "Home", icon: "☼" },
  { key: "library", label: "Library", icon: "▤" },
  { key: "study", label: "Study", icon: "✎" },
  { key: "stats", label: "Stats", icon: "▦" },
];

export default function StudyApp({
  onBack,
}: StudyAppProps) {
  const [tab, setTab] = useState<Tab>("home");

  const [books, setBooks] = useState<WordBook[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettings] =
    useState<StudySettings | null>(null);

  /* Library 里打开了哪本书 */
  const [openBookId, setOpenBookId] = useState<
    string | null
  >(null);

  /* CSV 导入弹窗 */
  const [showImport, setShowImport] = useState(false);

  /* 设置弹窗 */
  const [showSettings, setShowSettings] =
    useState(false);

  /* 当前学习会话 */
  const [session, setSession] =
    useState<StudySessionState | null>(null);

  /* ---------- 初始化 ---------- */

  useEffect(() => {
    setBooks(loadBooks());
    setWords(loadWords());
    setSettings(loadStudySettings());
    initSpeech();
    setHydrated(true);
  }, []);

  /* ---------- 提交 ---------- */

  const commitBooks = useCallback(
    (next: WordBook[]) => {
      setBooks(next);
      saveBooks(next);
    },
    []
  );

  const commitWords = useCallback((next: Word[]) => {
    setWords(next);
    saveWords(next);
  }, []);

  const patchWord = useCallback(
    (wordId: string, patch: Partial<Word>) => {
      setWords((prev) => {
        const next = prev.map((w) =>
          w.id === wordId ? { ...w, ...patch } : w
        );
        saveWords(next);
        return next;
      });
    },
    []
  );

  /* ---------- 词书 CRUD ---------- */

  function createBook(
    name: string,
    description: string
  ) {
    const book: WordBook = {
      id: createBookId(),
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    commitBooks([book, ...books]);
  }

  function renameBook(
    bookId: string,
    name: string,
    description: string
  ) {
    commitBooks(
      books.map((b) =>
        b.id === bookId
          ? {
              ...b,
              name,
              description,
              updatedAt: Date.now(),
            }
          : b
      )
    );
  }

  function deleteBook(bookId: string) {
    commitBooks(books.filter((b) => b.id !== bookId));
    commitWords(
      words.filter((w) => w.bookId !== bookId)
    );
    if (openBookId === bookId) setOpenBookId(null);
    if (session?.bookId === bookId) setSession(null);
  }

  /* ---------- 单词 CRUD ---------- */

  function addWord(
    text: string,
    meaning: string,
    example: string
  ) {
    if (!openBookId) return;

    const exists = words.some(
      (w) =>
        w.bookId === openBookId &&
        w.text.toLowerCase() === text.toLowerCase()
    );
    if (exists) {
      alert("这个单词已经在词书里了。");
      return;
    }

    const word: Word = {
      id: createWordId(),
      bookId: openBookId,
      text,
      meaning,
      example,
      mastery: "new",
      correctCount: 0,
      wrongCount: 0,
      createdAt: Date.now(),
      lastReviewedAt: null,
    };

    commitWords([word, ...words]);

    commitBooks(
      books.map((b) =>
        b.id === openBookId
          ? { ...b, updatedAt: Date.now() }
          : b
      )
    );
  }

  function updateWord(
    wordId: string,
    text: string,
    meaning: string,
    example: string
  ) {
    if (!openBookId) return;

    const exists = words.some(
      (w) =>
        w.bookId === openBookId &&
        w.id !== wordId &&
        w.text.toLowerCase() === text.toLowerCase()
    );
    if (exists) {
      alert("这个单词已经在词书里了。");
      return;
    }

    commitWords(
      words.map((w) =>
        w.id === wordId
          ? { ...w, text, meaning, example }
          : w
      )
    );
  }

  function deleteWord(wordId: string) {
    commitWords(words.filter((w) => w.id !== wordId));
  }

  /* ---------- CSV 导入 ---------- */

  function importWords(
    target:
      | { type: "existing"; bookId: string }
      | { type: "new"; name: string },
    rows: CsvWordRow[]
  ): {
    added: number;
    skipped: number;
    bookName: string;
  } {
    let targetBookId: string;
    let targetBookName: string;
    let nextBooks = books;

    if (target.type === "existing") {
      const found = books.find(
        (b) => b.id === target.bookId
      );
      if (!found) {
        return {
          added: 0,
          skipped: rows.length,
          bookName: "",
        };
      }
      targetBookId = found.id;
      targetBookName = found.name;
    } else {
      const book: WordBook = {
        id: createBookId(),
        name: target.name,
        description: "CSV 导入",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      nextBooks = [book, ...books];
      targetBookId = book.id;
      targetBookName = book.name;
    }

    const existingLower = new Set(
      words
        .filter((w) => w.bookId === targetBookId)
        .map((w) => w.text.toLowerCase())
    );

    const now = Date.now();
    const newWords: Word[] = [];
    let added = 0;
    let skipped = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const lower = r.text.toLowerCase();
      if (existingLower.has(lower)) {
        skipped++;
        continue;
      }
      existingLower.add(lower);
      newWords.push({
        id: createWordId(),
        bookId: targetBookId,
        text: r.text,
        meaning: r.meaning,
        example: r.example,
        mastery: "new",
        correctCount: 0,
        wrongCount: 0,
        createdAt: now + i,
        lastReviewedAt: null,
      });
      added++;
    }

    if (newWords.length > 0) {
      commitWords([...newWords.reverse(), ...words]);
    }

    if (target.type === "existing") {
      nextBooks = books.map((b) =>
        b.id === targetBookId
          ? { ...b, updatedAt: Date.now() }
          : b
      );
    }

    if (target.type === "new" || newWords.length > 0) {
      commitBooks(nextBooks);
    }

    return {
      added,
      skipped,
      bookName: targetBookName,
    };
  }

  /* ---------- 会话 ---------- */

  function startSession(
    partner: SessionPartner,
    bookId: string
  ) {
    if (!settings) return;

    const bookWords = words.filter(
      (w) => w.bookId === bookId
    );

    /* 未掌握的优先，但组内随机打乱 */
    const fresh = bookWords.filter(
      (w) => w.mastery !== "mastered"
    );
    const mastered = bookWords.filter(
      (w) => w.mastery === "mastered"
    );

    const shuffle = <T,>(arr: T[]): T[] => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    const pool = [
      ...shuffle(fresh),
      ...shuffle(mastered),
    ];

    const wordIds = pool
      .slice(0, settings.sessionSize)
      .map((w) => w.id);

    setSession({
      partner,
      bookId,
      limit: settings.sessionSize,
      wordIds,
      index: 0,
      startedAt: Date.now(),
      studiedWordIds: [],
    });
  }

  /* 会话结束后"再来一轮"：同一个词书同一 partner，重新抽词 */
  function restartSession() {
    if (!session) return;
    startSession(session.partner, session.bookId);
  }

  function exitSession() {
    setSession(null);
  }

  /* ---------- 当前打开的词书 ---------- */

  const openBook = openBookId
    ? books.find((b) => b.id === openBookId) ?? null
    : null;

  const openBookWords = openBookId
    ? words.filter((w) => w.bookId === openBookId)
    : [];

  /* 会话里的书 */
  const sessionBook = session
    ? books.find((b) => b.id === session.bookId) ?? null
    : null;

  const sessionWords = session
    ? words.filter((w) => w.bookId === session.bookId)
    : [];

  /* ---------- Render ---------- */

  const showMainHeader =
    tab !== "library" || openBook === null;

  /* Study Tab 是否是会话中 */
  const inSession =
    tab === "study" && session !== null && sessionBook;

  return (
    <main className="app-screen study-app">
      {showMainHeader && !inSession && (
        <header className="study-header">
          <button
            className="study-back"
            onClick={onBack}
            aria-label="返回"
          >
            ‹
          </button>

          <div className="study-header-center">
            <div className="study-header-title">Study</div>
            <div className="study-header-sub">
              a quiet place to learn
            </div>
          </div>

          <button
            className="study-header-settings"
            onClick={() => setShowSettings(true)}
            aria-label="设置"
          >
            ⚙
          </button>
        </header>
      )}

      {tab === "home" && (
        <div className="study-scroll">
          <div className="study-empty">
            <div className="study-empty-icon">☼</div>
            <div className="study-empty-title">每日一句</div>
            <div className="study-empty-desc">
              每天一句文学摘抄，会显示在这里
            </div>
          </div>
        </div>
      )}

      {tab === "library" && !hydrated && (
        <div className="study-scroll">
          <div className="study-empty">
            <div className="study-empty-icon">…</div>
            <div className="study-empty-title">
              正在加载
            </div>
          </div>
        </div>
      )}

      {tab === "library" && hydrated && openBook && (
        <BookDetail
          book={openBook}
          words={openBookWords}
          onBack={() => setOpenBookId(null)}
          onAddWord={addWord}
          onUpdateWord={updateWord}
          onDeleteWord={deleteWord}
        />
      )}

      {tab === "library" && hydrated && !openBook && (
        <BookList
          books={books}
          words={words}
          onOpenBook={(id) => setOpenBookId(id)}
          onCreateBook={createBook}
          onRenameBook={renameBook}
          onDeleteBook={deleteBook}
          onOpenImport={() => setShowImport(true)}
        />
      )}

      {tab === "study" &&
        !inSession &&
        settings && (
          <StudyHome
            books={books}
            words={words}
            onStart={startSession}
          />
        )}

      {tab === "study" &&
        inSession &&
        sessionBook &&
        settings && (
          <StudySession
            partner={session!.partner}
            book={sessionBook}
            words={sessionWords}
            sessionWordIds={session!.wordIds}
            settings={settings}
            onExit={exitSession}
            onRestart={restartSession}
            onUpdateWord={patchWord}
          />
        )}

      {tab === "stats" && (
        <div className="study-scroll">
          <div className="study-empty">
            <div className="study-empty-icon">▦</div>
            <div className="study-empty-title">统计</div>
            <div className="study-empty-desc">
              学习一些单词后，这里会显示数据
            </div>
          </div>
        </div>
      )}

      {!inSession && (
        <nav className="study-dock">
          <div className="study-dock-inner">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`study-dock-tab${
                  tab === t.key ? " active" : ""
                }`}
                onClick={() => setTab(t.key)}
                aria-label={t.label}
              >
                <span className="study-dock-icon">
                  {t.icon}
                </span>
                <span className="study-dock-label">
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </nav>
      )}

      {showImport && (
        <ImportCSVModal
          books={books}
          words={words}
          onImport={importWords}
          onClose={() => setShowImport(false)}
        />
      )}

      {showSettings && settings && (
        <StudySettingsPanel
          settings={settings}
          onChange={(next) => setSettings(next)}
          onClose={() => setShowSettings(false)}
        />
      )}
    </main>
  );
}