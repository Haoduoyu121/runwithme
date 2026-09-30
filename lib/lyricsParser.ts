/* =========================================================
   RunWithme · Lyrics Parser
   把 LRC 文本解析成结构化行（含时间轴）
   ========================================================= */

export type LyricLine = {
  /** 秒；无时间标签时为 -1 */
  time: number;
  text: string;
  index: number;
};

export type ParsedLyrics = {
  /** true = 有时间标签，可滚动高亮；false = 纯文本 */
  synced: boolean;
  lines: LyricLine[];
};

/** [mm:ss] / [mm:ss.xx] / [mm:ss.xxx] / [mm:ss:xx] 都吃 */
const TIME_TAG_RE = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
/** [offset:±ms] */
const OFFSET_RE = /\[offset:\s*([+-]?\d+)\s*\]/i;
/** 元数据标签：[ti:][ar:][al:][by:][length:][re:][ve:] */
const META_TAG_RE = /^\[(ti|ar|al|by|length|re|ve|kana|offset):/i;

/**
 * 解析 LRC 文本。
 * - 支持一行多个时间标签（会展开成多行）
 * - 支持 [offset:±ms] 全局偏移
 * - 无时间标签 → synced = false，time 全为 -1
 */
export function parseLrc(raw: string): ParsedLyrics {
  if (!raw || !raw.trim()) {
    return { synced: false, lines: [] };
  }

  /* 全局 offset */
  let offsetSec = 0;
  const offsetMatch = raw.match(OFFSET_RE);
  if (offsetMatch) {
    const n = Number(offsetMatch[1]);
    if (Number.isFinite(n)) offsetSec = n / 1000;
  }

  const rawLines = raw.split(/\r?\n/);
  const out: LyricLine[] = [];
  let sawTimeTag = false;

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (META_TAG_RE.test(trimmed)) continue;

    /* 抽出这一行里所有时间标签 */
    const tags: number[] = [];
    TIME_TAG_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    let lastEnd = 0;

    while ((m = TIME_TAG_RE.exec(trimmed)) !== null) {
      const mm = Number(m[1]);
      const ss = Number(m[2]);
      const fracRaw = m[3] ?? "0";
      let ms = 0;
      if (fracRaw.length === 1) ms = Number(fracRaw) * 100;
      else if (fracRaw.length === 2) ms = Number(fracRaw) * 10;
      else ms = Number(fracRaw);
      tags.push(mm * 60 + ss + ms / 1000 + offsetSec);
      lastEnd = m.index + m[0].length;
    }

    const text = trimmed.slice(lastEnd).trim();

    if (tags.length > 0) {
      sawTimeTag = true;
      for (const t of tags) {
        out.push({ time: t, text, index: out.length });
      }
    } else {
      out.push({ time: -1, text: trimmed, index: out.length });
    }
  }

  if (!sawTimeTag) {
    /* 纯文本歌词：去空行、重建 index */
    const lines = out
      .filter((l) => l.text.length > 0)
      .map((l, i) => ({ time: -1, text: l.text, index: i }));
    return { synced: false, lines };
  }

  /* 有时间标签：只保留有时间轴的行，按时间排序 */
  const syncedLines = out
    .filter((l) => l.time >= 0)
    .sort((a, b) => a.time - b.time || a.index - b.index)
    .map((l, i) => ({ time: l.time, text: l.text, index: i }));

  return { synced: true, lines: syncedLines };
}

/**
 * 二分查找：返回「time <= currentTime」的最后一个下标。
 * 找不到返回 -1。
 */
export function findActiveLine(
  lines: LyricLine[],
  currentTime: number
): number {
  if (lines.length === 0) return -1;
  let lo = 0;
  let hi = lines.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= currentTime) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}