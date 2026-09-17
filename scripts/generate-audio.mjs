import fs from "fs/promises";
import path from "path";

const API_KEY = process.env.MINIMAX_API_KEY || "";
const MODEL = "speech-2.8-hd";
const API_URL = "https://api.minimaxi.com/v1/t2a_v2";

/* 两个音色 */
const VOICES = [
  { id: "voice_levi1", subdir: "levi" },
  { id: "voice_Erwin", subdir: "erwin" },
];

/* 每次请求间隔（毫秒）。250ms ≈ 4 QPS，安全 */
const REQUEST_GAP = 250;

/* ---------- 音频参数（降采样省空间） ---------- */
const AUDIO_SETTING = {
  sample_rate: 16000,    /* 16kHz 足够人声清晰 */
  bitrate: 64000,        /* 64kbps */
  format: "mp3",
  channel: 1,            /* 单声道 */
};

/* ---------- 可选：只跑某个音色 ---------- */
/* 用命令行参数：node generate-audio.mjs levi   （只跑 levi） */
const onlyVoice = process.argv[2] || null;

if (!API_KEY) {
  console.error(
    "请先设置：$env:MINIMAX_API_KEY = \"你的密钥\""
  );
  process.exit(1);
}

/* ---------- 读词表 ---------- */

const csv = await fs.readFile("scripts/words.csv", "utf-8");
const words = csv
  .split(/\r?\n/)
  .map((line) => line.split(",")[0].trim())
  .filter(Boolean);

if (words.length === 0) {
  console.error("scripts/words.csv 里没有单词。");
  process.exit(1);
}

console.log(`共 ${words.length} 个单词`);

function toFileName(word) {
  return word
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/\s+/g, "_")
    .trim();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ---------- 生成一个 mp3 ---------- */

async function generateOne(word, voiceId, filePath) {
  const resp = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      text: word,
      stream: false,
      output_format: "hex",
      voice_setting: {
        voice_id: voiceId,
        speed: 0.9,
        vol: 1.0,
        pitch: 0,
      },
      audio_setting: AUDIO_SETTING,
    }),
  });

  const data = await resp.json();

  if (data?.base_resp?.status_code !== 0) {
    throw new Error(
      `API ${data?.base_resp?.status_code}: ${
        data?.base_resp?.status_msg || "unknown"
      }`
    );
  }

  const hexAudio = data?.data?.audio;
  if (!hexAudio) {
    throw new Error("no audio in response");
  }

  await fs.mkdir(path.dirname(filePath), {
    recursive: true,
  });
  await fs.writeFile(
    filePath,
    Buffer.from(hexAudio, "hex")
  );

  return hexAudio.length / 2; /* 字节数 */
}

/* ---------- 主循环 ---------- */

const voicesToRun = onlyVoice
  ? VOICES.filter((v) => v.subdir === onlyVoice)
  : VOICES;

if (voicesToRun.length === 0) {
  console.error(`找不到音色：${onlyVoice}`);
  process.exit(1);
}

let totalOk = 0;
let totalSkip = 0;
let totalFail = 0;
let totalBytes = 0;
const startedAt = Date.now();

for (const voice of voicesToRun) {
  console.log(
    `\n=== ${voice.subdir} (${voice.id}) ===`
  );

  let voiceOk = 0;
  let voiceSkip = 0;
  let voiceFail = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const fileName = `${toFileName(word)}.mp3`;
    const filePath = path.join(
      "public/audio/words",
      voice.subdir,
      fileName
    );

    /* 增量跳过 */
    try {
      await fs.access(filePath);
      voiceSkip++;
      continue;
    } catch {}

    try {
      const bytes = await generateOne(
        word,
        voice.id,
        filePath
      );
      voiceOk++;
      totalBytes += bytes;

      /* 每 25 个打印一次进度 */
      if (voiceOk % 25 === 0) {
        console.log(
          `  ${voiceOk} 完成 / ${i + 1} 处理`
        );
      }
    } catch (e) {
      console.error(
        `  FAIL ${word}: ${e.message}`
      );
      voiceFail++;

      /* 如果是限流，等久一点 */
      if (
        e.message.includes("1039") ||
        e.message.includes("rate")
      ) {
        console.log("  限流，等 5 秒…");
        await sleep(5000);
      }
    }

    await sleep(REQUEST_GAP);
  }

  console.log(
    `  完成：ok=${voiceOk} skip=${voiceSkip} fail=${voiceFail}`
  );
  totalOk += voiceOk;
  totalSkip += voiceSkip;
  totalFail += voiceFail;
}

const elapsed = Math.round(
  (Date.now() - startedAt) / 1000
);

console.log(
  `\n总计：ok=${totalOk} skip=${totalSkip} fail=${totalFail}`
);
console.log(
  `耗时：${Math.floor(elapsed / 60)}分 ${elapsed % 60}秒`
);
console.log(
  `音频总大小：${(totalBytes / 1024 / 1024).toFixed(2)} MB`
);
console.log(
  `\n下一步：把 public/audio/words/ 一起提交到 git`
);