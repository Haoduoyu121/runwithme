/* PNG 角色卡解析 —— 兼容 SillyTavern v1/v2/v3 格式 */

export type ParsedCard = {
  id: string;
  name: string;
  avatar: string;
  payload: {
    description: string;
    personality: string;
    scenario: string;
    first_mes: string;
    mes_example: string;
    creator_notes: string;
    system_prompt: string;
    character_book?: unknown;
  };
};

function genId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return (
    "card-" +
    Date.now() +
    "-" +
    Math.random().toString(36).slice(2, 8)
  );
}

async function readPngChunks(buf: ArrayBuffer) {
  const dv = new DataView(buf);
  const u8 = new Uint8Array(buf);
  let offset = 8;
  const chunks: { type: string; data: Uint8Array }[] = [];
  while (offset + 12 <= buf.byteLength) {
    const length = dv.getUint32(offset);
    if (length > buf.byteLength) break;
    const type = String.fromCharCode(
      u8[offset + 4],
      u8[offset + 5],
      u8[offset + 6],
      u8[offset + 7]
    );
    const data = u8.slice(offset + 8, offset + 8 + length);
    chunks.push({ type, data });
    offset += 12 + length;
    if (type === "IEND") break;
  }
  return chunks;
}

function parseTEXt(
  data: Uint8Array
): { keyword: string; text: string } | null {
  let idx = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i] === 0) {
      idx = i;
      break;
    }
  }
  if (idx < 0) return null;
  const keyword = new TextDecoder("latin1").decode(
    data.slice(0, idx)
  );
  const text = new TextDecoder("latin1").decode(
    data.slice(idx + 1)
  );
  return { keyword, text };
}

function parseITXt(
  data: Uint8Array
): { keyword: string; text: string } | null {
  let i = 0;
  let kEnd = -1;
  for (; i < data.length; i++) {
    if (data[i] === 0) {
      kEnd = i;
      break;
    }
  }
  if (kEnd < 0) return null;
  const keyword = new TextDecoder("latin1").decode(
    data.slice(0, kEnd)
  );
  i = kEnd + 1;
  if (i + 2 > data.length) return null;
  const compFlag = data[i];
  i++;
  i++; /* compMethod */
  let lEnd = -1;
  for (; i < data.length; i++) {
    if (data[i] === 0) {
      lEnd = i;
      break;
    }
  }
  if (lEnd < 0) return null;
  i = lEnd + 1;
  let tkEnd = -1;
  for (; i < data.length; i++) {
    if (data[i] === 0) {
      tkEnd = i;
      break;
    }
  }
  if (tkEnd < 0) return null;
  i = tkEnd + 1;
  if (compFlag !== 0) return null;
  const text = new TextDecoder("utf-8").decode(data.slice(i));
  return { keyword, text };
}

function b64ToUtf8(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder("utf-8").decode(bytes);
}

async function pngToAvatar(file: File): Promise<string> {
  try {
    const bmp = await createImageBitmap(file);
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    const s = Math.min(bmp.width, bmp.height);
    const sx = (bmp.width - s) / 2;
    const sy = (bmp.height - s) / 2;
    ctx.drawImage(bmp, sx, sy, s, s, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return "";
  }
}

type RawCard = Record<string, unknown> & {
  data?: Record<string, unknown>;
};

function pick(obj: RawCard, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v) return v;
  }
  return "";
}

function normalizeCard(raw: RawCard) {
  let d: Record<string, unknown> = raw;
  if (raw.data && typeof raw.data === "object") {
    d = raw.data;
  }
  return {
    description: pick(d, ["description"]),
    personality: pick(d, ["personality"]),
    scenario: pick(d, ["scenario"]),
    first_mes: pick(d, ["first_mes", "first_message"]),
    mes_example: pick(d, ["mes_example", "example_dialogue"]),
    creator_notes: pick(d, ["creator_notes", "creatorcomment"]),
    system_prompt: pick(d, ["system_prompt"]),
    character_book: d["character_book"] ?? null,
  };
}

const KEYWORDS = new Set(["chara", "ccv3", "ccv2"]);

export async function parsePngCard(
  file: File
): Promise<ParsedCard> {
  const buf = await file.arrayBuffer();
  const chunks = await readPngChunks(buf);
  let raw: RawCard | null = null;

  for (const c of chunks) {
    if (c.type === "tEXt") {
      const t = parseTEXt(c.data);
      if (t && KEYWORDS.has(t.keyword)) {
        try {
          raw = JSON.parse(b64ToUtf8(t.text)) as RawCard;
          break;
        } catch {
          /* skip */
        }
      }
    } else if (c.type === "iTXt") {
      const t = parseITXt(c.data);
      if (t && KEYWORDS.has(t.keyword)) {
        try {
          let s = t.text;
          /* iTXt 里可能是 JSON 原文，也可能是 base64 */
          if (/^[A-Za-z0-9+/=]+$/.test(s) && s.length > 20) {
            try {
              s = b64ToUtf8(s);
            } catch {
              /* 就当它是原文 */
            }
          }
          raw = JSON.parse(s) as RawCard;
          break;
        } catch {
          /* skip */
        }
      }
    }
  }

  if (!raw) {
    throw new Error("这张 PNG 里没有内嵌角色卡数据");
  }

  const name =
    pick(raw, ["name"]) ||
    (raw.data ? pick(raw.data, ["name"]) : "") ||
    "未命名";

  const avatar = await pngToAvatar(file);

  return {
    id: genId(),
    name,
    avatar,
    payload: normalizeCard(raw),
  };
}

export async function parseJsonCard(
  file: File
): Promise<ParsedCard> {
  const text = await file.text();
  const raw = JSON.parse(text) as RawCard;
  const name =
    pick(raw, ["name"]) ||
    (raw.data ? pick(raw.data, ["name"]) : "") ||
    file.name.replace(/\.json$/i, "");
  return {
    id: genId(),
    name,
    avatar: "",
    payload: normalizeCard(raw),
  };
}