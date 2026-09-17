"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createBookId,
  createWordId,
  type DailySentence as DailySentenceType,
  type SessionPartner,
  type StudyMistake,
  type StudySessionState,
  type StudySettings,
  type Word,
  type WordBook,
} from "@/data/study";

import {
  addMistake,
  getTodaySentence,
  hasSystemCollectedToday,
  loadBooks,
  loadDailySentences,
  loadMistakes,
  loadStudySettings,
  loadWords,
  markSystemCollectedToday,
  removeMistake,
  saveBooks,
  saveMistakes,
  saveWords,
  updateTodayRecord,
} from "@/lib/studyStorage";

import { useCollection } from "@/lib/CollectionContext";

import {
  loadCollectionNoteCards,
  pickCollectionNoteCard,
} from "@/lib/collectionNoteCardStorage";

import BookList from "@/components/apps/study/BookList";
import BookDetail from "@/components/apps/study/BookDetail";
import ImportCSVModal from "@/components/apps/study/ImportCSVModal";
import StudyHome from "@/components/apps/study/StudyHome";
import StudySession from "@/components/apps/study/StudySession";
import StudySettingsPanel from "@/components/apps/study/StudySettingsPanel";
import StatsPanel from "@/components/apps/study/StatsPanel";
import DailySentence from "@/components/apps/study/DailySentence";

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
  const {
    items: collectionItems,
    add: addCollection,
    remove: removeCollection,
  } = useCollection();

  const [tab, setTab] = useState<Tab>("home");

  const [todaySentence, setTodaySentence] =
    useState<DailySentenceType | null>(null);

  const [books, setBooks] = useState<WordBook[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettings] =
    useState<StudySettings | null>(null);
  const [mistakes, setMistakes] = useState<
    StudyMistake[]
  >([]);

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
    setMistakes(loadMistakes());
    initSpeech();
    setHydrated(true);
  }, []);

  /* 加载今日一句 */
  useEffect(() => {
    if (!hydrated) return;
    const all = loadDailySentences();
    const s = getTodaySentence(all);
    setTodaySentence(s);
  }, [hydrated]);

  /* 系统收藏判定（每天一次） */
  useEffect(() => {
    if (!hydrated) return;
    if (!todaySentence) return;
    if (hasSystemCollectedToday()) return;

    markSystemCollectedToday();

    /* 抛硬币：4 种结果各 25% */
    const r = Math.random();

    let owners: ("levi" | "erwin")[] = [];
    if (r < 0.25) {
      /* 都不收藏 */
      return;
    } else if (r < 0.5) {
      owners = ["levi"];
    } else if (r < 0.75) {
      owners = ["erwin"];
    } else {
      owners = ["levi", "erwin"];
    }

    /* 内容字符串 */
    const content = `「${todaySentence.text}」${
      todaySentence.source ? ` — ${todaySentence.source}` : ""
    }`;

    for (const owner of owners) {
      /* 已存在同 owner + source + sourceId → 跳过 */
      const exists = collectionItems.some(
        (it) =>
          it.owner === owner &&
          it.source === "daily-sentence" &&
          it.sourceId === todaySentence.id
      );
      if (exists) continue;

      /* 从备注卡池抽一条 */
      const cards = loadCollectionNoteCards();
      const card = pickCollectionNoteCard(cards, owner);

      addCollection({
        owner,
        source: "daily-sentence",
        sourceId: todaySentence.id,
        content,
        note: card ? card.text : "",
        originalAt: Date.now(),
      });
    }
  }, [
    hydrated,
    todaySentence,
    collectionItems,
    addCollection,
  ]);

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

    const recordStudy = useCallback(
    (wordIds: string[], correct: boolean) => {
      updateTodayRecord(wordIds, correct);
    },
    []
  );

  const handleAddMistake = useCallback(
    (wordId: string) => {
      setMistakes((prev) => {
        const next = addMistake(prev, wordId);
        saveMistakes(next);
        return next;
      });
    },
    []
  );

  const handleRemoveMistake = useCallback(
    (wordId: string) => {
      setMistakes((prev) => {
        const next = removeMistake(prev, wordId);
        saveMistakes(next);
        return next;
      });
    },
    []
  );

    /* ---------- 每日一句：用户收藏 ---------- */

  function toggleCollectTodaySentence() {
    if (!todaySentence) return;

    const existing = collectionItems.find(
      (it) =>
        it.owner === "user" &&
        it.source === "daily-sentence" &&
        it.sourceId === todaySentence.id
    );

    if (existing) {
      removeCollection(existing.id);
      return;
    }

    addCollection({
      owner: "user",
      source: "daily-sentence",
      sourceId: todaySentence.id,
      content: `「${todaySentence.text}」${
        todaySentence.source
          ? ` — ${todaySentence.source}`
          : ""
      }`,
      originalAt: Date.now(),
    });
  }

  const todaySentenceCollected = todaySentence
    ? collectionItems.some(
        (it) =>
          it.owner === "user" &&
          it.source === "daily-sentence" &&
          it.sourceId === todaySentence.id
      )
    : false;

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
      kind: "normal",
      partner,
      bookId,
      limit: settings.sessionSize,
      wordIds,
      index: 0,
      startedAt: Date.now(),
      studiedWordIds: [],
    });
  }

  /* 错题集会话 */
  function startMistakeSession(partner: SessionPartner) {
    if (!settings) return;

    /* 有效的错题 id */
    const validIds = mistakes
      .map((m) => m.wordId)
      .filter((id) => words.some((w) => w.id === id));

    if (validIds.length === 0) return;

    /* 随机打乱 */
    const shuffled = [...validIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [
        shuffled[j],
        shuffled[i],
      ];
    }

    /* 只取前 sessionSize 个 */
    const wordIds = shuffled.slice(
      0,
      settings.sessionSize
    );

    setSession({
      kind: "mistakes",
      partner,
      bookId: "__mistakes__",
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
    if (session.kind === "mistakes") {
      startMistakeSession(session.partner);
    } else {
      startSession(session.partner, session.bookId);
    }
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
  /* 错题集会话没有 book，用一个占位对象 */
  const sessionBook = session
    ? session.kind === "mistakes"
      ? ({
          id: "__mistakes__",
          name: "错题集",
          description: "",
          createdAt: 0,
          updatedAt: 0,
        } as WordBook)
      : books.find((b) => b.id === session.bookId) ?? null
    : null;

  /* 错题集会话：words 直接从 sessionWordIds 里取
     普通会话：从 bookId 过滤 */
  const sessionWords = useMemo(() => {
    if (!session) return [];
    if (session.kind === "mistakes") {
      return words.filter((w) =>
        session.wordIds.includes(w.id)
      );
    }
    return words.filter((w) => w.bookId === session.bookId);
  }, [session, words]);

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
          {todaySentence ? (
            <DailySentence
              sentence={todaySentence}
              collected={todaySentenceCollected}
              onToggle={toggleCollectTodaySentence}
            />
          ) : (
            <div className="study-empty">
              <div className="study-empty-icon">☼</div>
              <div className="study-empty-title">
                还没有每日一句
              </div>
            </div>
          )}
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
            mistakes={mistakes}
            onStart={startSession}
            onStartMistakes={startMistakeSession}
          />
        )}

      {tab === "study" &&
        inSession &&
        sessionBook &&
        settings && (
          <StudySession
            kind={session!.kind}
            partner={session!.partner}
            book={sessionBook}
            words={sessionWords}
            sessionWordIds={session!.wordIds}
            settings={settings}
            onExit={exitSession}
            onRestart={restartSession}
            onUpdateWord={patchWord}
            onRecordStudy={recordStudy}
            onAddMistake={handleAddMistake}
            onRemoveMistake={handleRemoveMistake}
          />
        )}

      {tab === "stats" && (
        <StatsPanel books={books} words={words} />
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