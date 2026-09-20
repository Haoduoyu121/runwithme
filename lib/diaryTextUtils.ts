/** 按句号/问号/感叹号切句，保留标点 */
export function splitSentences(text: string): string[] {
  if (!text) return [];
  const result: string[] = [];
  let buf = "";
  for (const ch of text) {
    buf += ch;
    if ("。！？!?".includes(ch)) {
      result.push(buf);
      buf = "";
    }
  }
  if (buf) result.push(buf);
  return result;
}

/** 找 needle 在 haystack 里第 occurrence 次出现（0-based）的下标 */
export function findOccurrenceIndex(
  haystack: string,
  needle: string,
  occurrence: number
): number {
  if (!needle) return -1;
  let from = 0;
  let count = 0;
  while (true) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) return -1;
    if (count === occurrence) return idx;
    count += 1;
    from = idx + 1;
  }
}

/** 根据选中位置反推 occurrence */
export function inferOccurrence(
  haystack: string,
  needle: string,
  selectionStart: number
): number {
  if (!needle) return 0;
  let from = 0;
  let count = 0;
  while (true) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) return 0;
    if (idx === selectionStart) return count;
    count += 1;
    from = idx + 1;
  }
}