"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  Bookmark,
  ChevronLeft,
  Mail,
  MessageCircle,
  Music2,
  Search as SearchIcon,
  Sparkles,
  StickyNote,
  X,
} from "lucide-react";

import {
  buildSearchIndex,
  type IndexedItem,
  type SearchSourceApp,
} from "@/lib/searchIndex";

type SearchAppProps = { onBack: () => void };

const SOURCE_LABEL: Record<SearchSourceApp, string> = {
  memory: "Memory",
  music: "Music",
  notes: "Notes",
  wishlist: "Wishlist",
  chat: "Chat",
  letter: "Letter",
};

function sourceIcon(app: SearchSourceApp) {
  const size = 16;
  const sw = 2;
  switch (app) {
    case "memory":
      return <Sparkles size={size} strokeWidth={sw} />;
    case "music":
      return <Music2 size={size} strokeWidth={sw} />;
    case "notes":
      return <StickyNote size={size} strokeWidth={sw} />;
    case "wishlist":
      return <Bookmark size={size} strokeWidth={sw} />;
    case "chat":
      return (
        <MessageCircle size={size} strokeWidth={sw} />
      );
    case "letter":
      return <Mail size={size} strokeWidth={sw} />;
    default:
      return <SearchIcon size={size} strokeWidth={sw} />;
  }
}

/* 只高亮"整段 query 连续出现"的情况，多 token 分别高亮会视觉乱 */
function highlight(
  text: string,
  query: string
): ReactNode {
  const q = query.trim();
  if (!q || !text) return text;

  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  const idx = lower.indexOf(ql);

  if (idx === -1) return text;

  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-app-mark">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

function formatTimestamp(ts: number): string {
  if (!ts) return "";
  const now = Date.now();
  const diff = now - ts;

  if (diff < 60 * 1000) return "刚刚";
  if (diff < 60 * 60 * 1000) {
    return `${Math.floor(diff / 60000)} 分钟前`;
  }

  const d = new Date(ts);
  const nowD = new Date();
  const sameDay =
    d.getFullYear() === nowD.getFullYear() &&
    d.getMonth() === nowD.getMonth() &&
    d.getDate() === nowD.getDate();

  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");

  if (sameDay) return `${hh}:${mm}`;

  const yest = new Date(nowD);
  yest.setDate(yest.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yest.getFullYear() &&
    d.getMonth() === yest.getMonth() &&
    d.getDate() === yest.getDate();
  if (isYesterday) return `昨天 ${hh}:${mm}`;

  if (d.getFullYear() === nowD.getFullYear()) {
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }
  return `${d.getFullYear()}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}-${String(d.getDate()).padStart(
    2,
    "0"
  )}`;
}

const MAX_RESULTS = 120;

export default function SearchApp({ onBack }: SearchAppProps) {
  const [index, setIndex] = useState<IndexedItem[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setIndex(buildSearchIndex());
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const tokens = q.split(/\s+/).filter(Boolean);

    const scored: { item: IndexedItem; score: number }[] =
      [];

    for (const item of index) {
      const title = item.title.toLowerCase();
      const body = (item.body ?? "").toLowerCase();

      let score = 0;
      let hit = true;
      for (const t of tokens) {
        const inTitle = title.includes(t);
        const inBody = body.includes(t);
        if (!inTitle && !inBody) {
          hit = false;
          break;
        }
        score += inTitle ? 2 : 1;
      }
      if (!hit) continue;

      scored.push({ item, score });
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.item.timestamp - a.item.timestamp;
    });

    return scored
      .slice(0, MAX_RESULTS)
      .map((s) => s.item);
  }, [index, query]);

  const trimmed = query.trim();

  return (
    <main className="phone-screen app-screen search-app">
      <header className="search-app-header">
        <button
          className="search-app-back"
          onClick={onBack}
          aria-label="返回"
        >
          <ChevronLeft size={26} strokeWidth={2.4} />
        </button>

        <h1 className="search-app-title">Search</h1>

        <span className="search-app-count">
          {trimmed
            ? results.length > 0
              ? `${results.length}${
                  results.length >= MAX_RESULTS
                    ? "+"
                    : ""
                }`
              : ""
            : ""}
        </span>
      </header>

      <div className="search-app-input-wrap">
        <SearchIcon
          size={16}
          strokeWidth={2.2}
          className="search-app-input-icon"
        />
        <input
          className="search-app-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索一切…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
        />
        {query && (
          <button
            className="search-app-clear"
            onClick={() => setQuery("")}
            aria-label="清除"
          >
            <X size={14} strokeWidth={2.6} />
          </button>
        )}
      </div>

      <div className="search-app-scroll">
        {!trimmed ? (
          <div className="search-app-hint">
            <div className="search-app-hint-icon">
              <SearchIcon
                size={28}
                strokeWidth={1.6}
              />
            </div>
            <div className="search-app-hint-title">
              搜点什么吧
            </div>
            <div className="search-app-hint-desc">
              Chat · Letter · Notes · Wishlist ·
              Music · Memory
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="search-app-hint">
            <div className="search-app-hint-title">
              没有找到「{trimmed}」
            </div>
            <div className="search-app-hint-desc">
              试试更短的关键词
            </div>
          </div>
        ) : (
          <div className="search-app-list">
            {results.map((r) => (
              <article
                key={r.id}
                className={`search-app-result search-app-result-${r.sourceApp}`}
              >
                <div className="search-app-result-icon">
                  {sourceIcon(r.sourceApp)}
                </div>

                <div className="search-app-result-body">
                  <div className="search-app-result-source">
                    {SOURCE_LABEL[r.sourceApp]}
                  </div>
                  <div className="search-app-result-title">
                    {highlight(r.title, trimmed)}
                  </div>
                  {r.body && (
                    <div className="search-app-result-text">
                      {highlight(r.body, trimmed)}
                    </div>
                  )}
                </div>

                {r.timestamp > 0 && (
                  <div className="search-app-result-time">
                    {formatTimestamp(r.timestamp)}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}