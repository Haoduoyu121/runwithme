"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Book,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clapperboard,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Mail,
  MapPin,
  MessageCircle,
  Music2,
  Shuffle,
  Star,
  StickyNote,
  Trash2,
} from "lucide-react";

import {
  loadMemory,
  deleteMemoryEntry,
  type MemoryEntry,
  type MemorySourceApp,
} from "@/lib/memoryStorage";

type MemoryAppProps = { onBack: () => void };

const APP_LABEL: Record<MemorySourceApp, string> = {
  music: "Music",
  chat: "Chat",
  letter: "Letter",
  photos: "Photos",
  icity: "iCity",
  notes: "Notes",
  collection: "Collection",
  calendar: "Calendar",
  study: "Study",
  watch: "Watch",
  read: "Read",
  random: "Random",
  checkin: "Check-in",
  questionnaire: "Q&A",
};

function getAppIcon(app: MemorySourceApp) {
  const size = 16;
  const sw = 2;
  switch (app) {
    case "music":
      return <Music2 size={size} strokeWidth={sw} />;
    case "chat":
      return <MessageCircle size={size} strokeWidth={sw} />;
    case "letter":
      return <Mail size={size} strokeWidth={sw} />;
    case "photos":
      return <ImageIcon size={size} strokeWidth={sw} />;
    case "icity":
      return <MapPin size={size} strokeWidth={sw} />;
    case "notes":
      return <StickyNote size={size} strokeWidth={sw} />;
    case "collection":
      return <Star size={size} strokeWidth={sw} />;
    case "calendar":
      return <Calendar size={size} strokeWidth={sw} />;
    case "study":
      return <BookOpen size={size} strokeWidth={sw} />;
    case "watch":
      return <Clapperboard size={size} strokeWidth={sw} />;
    case "read":
      return <Book size={size} strokeWidth={sw} />;
    case "random":
      return <Shuffle size={size} strokeWidth={sw} />;
    case "checkin":
      return <CheckCircle2 size={size} strokeWidth={sw} />;
    case "questionnaire":
      return <HelpCircle size={size} strokeWidth={sw} />;
    default:
      return <FileText size={size} strokeWidth={sw} />;
  }
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function sameDayStart(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b);
}

const WEEKDAYS = [
  "周日",
  "周一",
  "周二",
  "周三",
  "周四",
  "周五",
  "周六",
];

function formatDayLabel(ts: number): string {
  const now = Date.now();
  const todayStart = startOfDay(now);
  const thatStart = startOfDay(ts);
  const dayMs = 24 * 60 * 60 * 1000;
  const diff = Math.round((todayStart - thatStart) / dayMs);

  if (diff === 0) return "今天";
  if (diff === 1) return "昨天";

  const d = new Date(ts);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const wd = WEEKDAYS[d.getDay()];
  const thisYear = new Date().getFullYear();

  if (y === thisYear) return `${m}月${day}日 ${wd}`;
  return `${y}年${m}月${day}日 ${wd}`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

type DayGroup = {
  dayStart: number;
  label: string;
  entries: MemoryEntry[];
};

export default function MemoryApp({ onBack }: MemoryAppProps) {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [editing, setEditing] = useState(false);

  function reload() {
    setEntries(loadMemory());
  }

  useEffect(() => {
    reload();
  }, []);

  const groups: DayGroup[] = useMemo(() => {
    const sorted = [...entries].sort(
      (a, b) => b.timestamp - a.timestamp
    );

    const out: DayGroup[] = [];

    for (const e of sorted) {
      const dayStart = startOfDay(e.timestamp);
      const last = out[out.length - 1];

      if (last && sameDayStart(last.dayStart, dayStart)) {
        last.entries.push(e);
      } else {
        out.push({
          dayStart,
          label: formatDayLabel(e.timestamp),
          entries: [e],
        });
      }
    }

    return out;
  }, [entries]);

  function handleDelete(id: string) {
    if (!window.confirm("删除这条记忆？")) return;
    const ok = deleteMemoryEntry(id);
    if (ok) reload();
  }

  return (
    <main className="phone-screen app-screen memory-app">
      <header className="memory-header">
        <button
          className="memory-back"
          onClick={onBack}
          aria-label="返回"
        >
          <ChevronLeft size={26} strokeWidth={2.4} />
        </button>

        <h1 className="memory-title">Memory</h1>

        <button
          className="memory-edit-btn"
          onClick={() => setEditing((v) => !v)}
          disabled={entries.length === 0}
        >
          {editing ? "完成" : "编辑"}
        </button>
      </header>

      <div className="memory-scroll">
        {groups.length === 0 ? (
          <div className="memory-empty">
            <div className="memory-empty-icon">❋</div>
            <div className="memory-empty-title">
              还没有记忆
            </div>
            <div className="memory-empty-desc">
              一起听过歌、写过信、读过书……
              都会在这里留下痕迹
            </div>
          </div>
        ) : (
          groups.map((g) => (
            <section
              key={g.dayStart}
              className="memory-day-group"
            >
              <div className="memory-day-label">
                {g.label}
              </div>

              <div className="memory-day-list">
                {g.entries.map((e) => (
                  <article
                    key={e.id}
                    className={`memory-card memory-card-${e.sourceApp}`}
                  >
                    <div className="memory-card-icon">
                      {getAppIcon(e.sourceApp)}
                    </div>

                    <div className="memory-card-body">
                      <div className="memory-card-source">
                        {APP_LABEL[e.sourceApp]}
                      </div>
                      <div className="memory-card-title">
                        {e.title}
                      </div>
                      {e.preview && (
                        <div className="memory-card-preview">
                          {e.preview}
                        </div>
                      )}
                    </div>

                    <div className="memory-card-side">
                      <span className="memory-card-time">
                        {formatTime(e.timestamp)}
                      </span>
                      {editing && (
                        <button
                          className="memory-card-delete"
                          onClick={() =>
                            handleDelete(e.id)
                          }
                          aria-label="删除"
                        >
                          <Trash2
                            size={14}
                            strokeWidth={2.2}
                          />
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}