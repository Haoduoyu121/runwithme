"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Pencil, Sparkles } from "lucide-react";

import { useMusic } from "@/lib/MusicContext";
import { useCollection } from "@/lib/CollectionContext";

import {
  parseLrc,
  findActiveLine,
} from "@/lib/lyricsParser";

import {
  ensureLyrics,
  readFreshTrack,
  readLyricsFromTrack,
} from "@/lib/lyricsService";

import {
  decideLyricCollect,
  ownerDisplayName,
} from "@/lib/characterLyricCollect";

import type { ListenPartner } from "@/lib/listenTogetherStorage";

import ManualLyricSheet from "./ManualLyricSheet";

/** 自动收藏概率 */
const AUTO_COLLECT_CHANCE = 0.05;
/** 手动"让角色听"收藏概率 */
const MANUAL_COLLECT_CHANCE = 0.6;
/** 用户手动滚动后暂停自动跟随的毫秒数 */
const USER_SCROLL_PAUSE_MS = 3000;

/** 模块级：记录本次会话已经判定过自动收藏的 trackId */
const autoCheckedTracks = new Set<string>();

type Props = {
  partner: ListenPartner;
  onNotify?: (text: string) => void;
};

export default function LyricsPanel({
  partner,
  onNotify,
}: Props) {
  const {
    currentTrack,
    currentTime,
    duration,
    seek,
  } = useMusic();
  const { add } = useCollection();

  const [raw, setRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);

  const lineRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const userScrollingRef = useRef(false);
  const userScrollTimerRef = useRef<number | null>(null);

  /* 让 onNotify / add 保持最新（避免 effect 依赖不稳定） */
  const notifyRef = useRef(onNotify);
  useEffect(() => {
    notifyRef.current = onNotify;
  }, [onNotify]);

  const addRef = useRef(add);
  useEffect(() => {
    addRef.current = add;
  }, [add]);

  /* ---------- 加载歌词（缓存 + 网络） ---------- */
  useEffect(() => {
    if (!currentTrack) {
      setRaw("");
      return;
    }

    let cancelled = false;

    /* 先显示缓存 */
    const cached = readLyricsFromTrack(currentTrack.id);
    setRaw(cached?.raw ?? "");

    /* 再走网络（有 neteaseId 且需要更新时） */
    setLoading(true);
    (async () => {
      const got = await ensureLyrics(currentTrack);
      if (cancelled) return;
      setLoading(false);
      if (got) setRaw(got.raw);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id]);

  /* ---------- 监听歌词变化（手动粘贴 / 清空） ---------- */
  useEffect(() => {
    if (!currentTrack) return;
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ trackId: string }>;
      if (ce.detail?.trackId !== currentTrack.id) return;
      const got = readLyricsFromTrack(currentTrack.id);
      setRaw(got?.raw ?? "");
    };
    window.addEventListener(
      "runwithme:music-lyrics-updated",
      handler
    );
    return () => {
      window.removeEventListener(
        "runwithme:music-lyrics-updated",
        handler
      );
    };
  }, [currentTrack?.id]);

  /* ---------- 解析 + 当前行 ---------- */
  const parsed = useMemo(() => parseLrc(raw), [raw]);

  const activeIndex = useMemo(() => {
    if (!parsed.synced) return -1;
    return findActiveLine(parsed.lines, currentTime);
  }, [parsed, currentTime]);

  /* ---------- 自动滚动 ---------- */
  useEffect(() => {
    if (activeIndex < 0) return;
    if (userScrollingRef.current) return;
    const el = lineRefs.current[activeIndex];
    if (!el) return;
    el.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }, [activeIndex]);

  /* ---------- 自动收藏（每首歌一次判定） ---------- */
  useEffect(() => {
    if (!currentTrack) return;
    if (partner === "Solo") return;
    if (!raw) return;
    if (autoCheckedTracks.has(currentTrack.id)) return;

    autoCheckedTracks.add(currentTrack.id);

    const fresh = readFreshTrack(currentTrack.id);
    if (!fresh) return;

    const input = decideLyricCollect(
      fresh,
      partner,
      AUTO_COLLECT_CHANCE
    );
    if (!input) return;

    addRef.current({
      ...input,
      source: "lyric",
    });
    const who = ownerDisplayName(input.owner);
    notifyRef.current?.(`${who} 收藏了这句歌词`);
  }, [currentTrack, raw, partner]);

  /* ---------- 手动"让角色听" ---------- */
  function handleManualListen() {
    if (!currentTrack || partner === "Solo") return;

    const fresh = readFreshTrack(currentTrack.id);
    if (!fresh || !fresh.lyrics) {
      notifyRef.current?.("这首歌还没有歌词");
      return;
    }

    notifyRef.current?.("他正在听…");

    const delay = 1000 + Math.random() * 2000;
    window.setTimeout(() => {
      const input = decideLyricCollect(
        fresh,
        partner,
        MANUAL_COLLECT_CHANCE
      );
      if (!input) {
        notifyRef.current?.("他听完没有说话");
        return;
      }
      addRef.current({
        ...input,
        source: "lyric",
      });
      const who = ownerDisplayName(input.owner);
      notifyRef.current?.(`${who} 收藏了这句歌词`);
    }, delay);
  }

  /* ---------- 用户手动滚动检测 ---------- */
  function handleScroll() {
    userScrollingRef.current = true;
    if (userScrollTimerRef.current) {
      window.clearTimeout(userScrollTimerRef.current);
    }
    userScrollTimerRef.current = window.setTimeout(() => {
      userScrollingRef.current = false;
    }, USER_SCROLL_PAUSE_MS);
  }

  /* ---------- 渲染 ---------- */
  if (!currentTrack) {
    return (
      <div className="lyrics-panel">
        <div className="lyrics-empty">先选一首歌吧</div>
      </div>
    );
  }

  const canManualListen = partner !== "Solo";
  const partnerLabel =
    partner === "Both"
      ? "他们"
      : partner === "Levi"
        ? "Levi"
        : partner === "Erwin"
          ? "Erwin"
          : "";

  const isEmpty = parsed.lines.length === 0;

  return (
    <div className="lyrics-panel">
      <div
        className="lyrics-scroll"
        onScroll={handleScroll}
      >
        {isEmpty ? (
          <div className="lyrics-empty-block">
            <div className="lyrics-empty-title">
              {loading
                ? "正在拉取歌词…"
                : "这首歌还没有歌词"}
            </div>
            <button
              type="button"
              className="lyrics-manual-btn"
              onClick={() => setShowManual(true)}
            >
              <Pencil size={16} strokeWidth={2.2} />
              <span>手动粘贴歌词</span>
            </button>
          </div>
        ) : parsed.synced ? (
          parsed.lines.map((line, i) => (
            <button
              key={`${line.time}-${i}`}
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              type="button"
              className={
                "lyrics-line" +
                (i === activeIndex ? " is-active" : "")
              }
              onClick={() => seek(line.time)}
            >
              {line.text || "·"}
            </button>
          ))
        ) : (
          <div className="lyrics-plain">
            {parsed.lines.map((line, i) => (
              <div
                key={i}
                className="lyrics-plain-line"
              >
                {line.text}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="lyrics-actions">
        {canManualListen && (
          <button
            type="button"
            className="lyrics-action-btn"
            onClick={handleManualListen}
          >
            <Sparkles size={16} strokeWidth={2.2} />
            <span>让 {partnerLabel} 听</span>
          </button>
        )}
        <button
          type="button"
          className="lyrics-action-btn"
          onClick={() => setShowManual(true)}
        >
          <Pencil size={16} strokeWidth={2.2} />
          <span>编辑歌词</span>
        </button>
      </div>

      {showManual && (
        <ManualLyricSheet
          trackId={currentTrack.id}
          initialRaw={raw}
          onClose={() => setShowManual(false)}
        />
      )}
    </div>
  );
}