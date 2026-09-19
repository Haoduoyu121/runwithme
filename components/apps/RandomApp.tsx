"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ChevronLeft,
  Music2,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { useMusic } from "@/lib/MusicContext";
import {
  loadMemory,
  type MemoryEntry,
} from "@/lib/memoryStorage";

type RandomAppProps = { onBack: () => void };

type RandomCard = {
  id: string;
  sourceApp: "memory" | "music";
  title: string;
  body?: string;
  meta?: string;
};

function pickRandom<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function cardFromMemory(m: MemoryEntry): RandomCard {
  return {
    id: `mem-${m.id}`,
    sourceApp: "memory",
    title: m.title,
    body: m.preview,
    meta: "Memory",
  };
}

function cardFromMusic(item: {
  id: string;
  title: string;
  artist?: string;
}): RandomCard {
  return {
    id: `music-${item.id}`,
    sourceApp: "music",
    title: item.title,
    body: item.artist || "RunWithme",
    meta: "Music · 播放列表",
  };
}

export default function RandomApp({ onBack }: RandomAppProps) {
  const { music } = useMusic();

  const [memory, setMemory] = useState<MemoryEntry[]>([]);
  const [card, setCard] = useState<RandomCard | null>(null);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    setMemory(loadMemory());
  }, []);

  /* ★ 按数据源均分随机池：先随机 source，再随机 item */
  const pools = useMemo(() => {
    const result: (() => RandomCard)[] = [];

    if (memory.length > 0) {
      result.push(() => cardFromMemory(pickRandom(memory)!));
    }
    if (music.length > 0) {
      result.push(() => cardFromMusic(pickRandom(music)!));
    }

    return result;
  }, [memory, music]);

  const draw = useCallback(() => {
    if (pools.length === 0) {
      setCard(null);
      return;
    }

    setSpinning(true);
    const pick = pickRandom(pools)!;
    setCard(pick());

    window.setTimeout(() => setSpinning(false), 320);
  }, [pools]);

  /* 首次挂载 / 数据源变化 → 自动抽一次 */
  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isEmpty = pools.length === 0;

  return (
    <main className="phone-screen app-screen random-app">
      <header className="random-header">
        <button
          className="random-back"
          onClick={onBack}
          aria-label="返回"
        >
          <ChevronLeft size={26} strokeWidth={2.4} />
        </button>

        <h1 className="random-title">Random</h1>

        <button
          className="random-draw-btn"
          onClick={draw}
          disabled={isEmpty}
          aria-label="再抽一次"
        >
          <RefreshCw size={16} strokeWidth={2.4} />
        </button>
      </header>

      <div className="random-body">
        {isEmpty ? (
          <div className="random-card random-card-empty">
            <div className="random-card-icon">
              <Sparkles size={26} strokeWidth={1.8} />
            </div>
            <div className="random-card-source">
              EMPTY
            </div>
            <div className="random-card-title">
              还没有可以抽的内容
            </div>
            <div className="random-card-body">
              去听一首歌、写一封信、记一段笔记，
              再回来看看
            </div>
          </div>
        ) : card ? (
          <div
            key={card.id}
            className={`random-card random-card-${card.sourceApp}${
              spinning ? " is-spinning" : ""
            }`}
          >
            <div className="random-card-icon">
              {card.sourceApp === "music" ? (
                <Music2 size={26} strokeWidth={1.8} />
              ) : (
                <Sparkles size={26} strokeWidth={1.8} />
              )}
            </div>

            <div className="random-card-source">
              {card.meta ?? card.sourceApp.toUpperCase()}
            </div>

            <div className="random-card-title">
              {card.title}
            </div>

            {card.body && (
              <div className="random-card-body">
                {card.body}
              </div>
            )}
          </div>
        ) : null}

        <button
          className="random-again-btn"
          onClick={draw}
          disabled={isEmpty}
        >
          <RefreshCw size={14} strokeWidth={2.4} />
          再抽一次
        </button>
      </div>
    </main>
  );
}