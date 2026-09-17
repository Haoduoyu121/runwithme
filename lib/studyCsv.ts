/* =========================================================
   RunWithme · Study CSV 解析
   ========================================================= */

export type CsvWordRow = {
  text: string;
  meaning: string;
  example: string;
};

/* 简单但稳健的 CSV 解析：支持引号包裹、转义引号 "" */
function parseCSVRaw(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  /* 去掉 UTF-8 BOM */
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        current.push(field);
        field = "";
      } else if (ch === "\n") {
        current.push(field);
        rows.push(current);
        current = [];
        field = "";
      } else if (ch === "\r") {
        /* 忽略 \r，等 \n */
      } else {
        field += ch;
      }
    }
  }

  if (field.length > 0 || current.length > 0) {
    current.push(field);
    rows.push(current);
  }

  return rows;
}

export type ParseResult = {
  rows: CsvWordRow[];
  /* 解析但跳过的行数（缺列 / 空行） */
  skipped: number;
};

export function parseStudyCsv(content: string): ParseResult {
  const raw = parseCSVRaw(content);
  const rows: CsvWordRow[] = [];
  let skipped = 0;

  for (const r of raw) {
    /* 跳过整行空 */
    if (r.every((c) => c.trim().length === 0)) {
      continue;
    }

    const text = (r[0] ?? "").trim();
    const meaning = (r[1] ?? "").trim();
    const example = (r[2] ?? "").trim();

    if (!text || !meaning) {
      skipped++;
      continue;
    }

    rows.push({ text, meaning, example });
  }

  return { rows, skipped };
}

export function buildCsvTemplate(): string {
  return [
    "单词,释义,例句",
    "apple,苹果,I ate an apple.",
    "banana,香蕉,She likes bananas.",
  ].join("\n");
}