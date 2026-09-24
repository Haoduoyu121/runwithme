/* 从 Wikimedia Commons 拉 78 张 Rider-Waite
   输出到 public/tarot/default/00.jpg ~ 77.jpg */

import { writeFile, mkdir } from "node:fs/promises";

const COMMONS = "https://commons.wikimedia.org/wiki/Special:FilePath/";

const MAJOR = [
  ["00", "RWS_Tarot_00_Fool.jpg"],
  ["01", "RWS_Tarot_01_Magician.jpg"],
  ["02", "RWS_Tarot_02_High_Priestess.jpg"],
  ["03", "RWS_Tarot_03_Empress.jpg"],
  ["04", "RWS_Tarot_04_Emperor.jpg"],
  ["05", "RWS_Tarot_05_Hierophant.jpg"],
  ["06", "RWS_Tarot_06_Lovers.jpg"],
  ["07", "RWS_Tarot_07_Chariot.jpg"],
  ["08", "RWS_Tarot_08_Strength.jpg"],
  ["09", "RWS_Tarot_09_Hermit.jpg"],
  ["10", "RWS_Tarot_10_Wheel_of_Fortune.jpg"],
  ["11", "RWS_Tarot_11_Justice.jpg"],
  ["12", "RWS_Tarot_12_Hanged_Man.jpg"],
  ["13", "RWS_Tarot_13_Death.jpg"],
  ["14", "RWS_Tarot_14_Temperance.jpg"],
  ["15", "RWS_Tarot_15_Devil.jpg"],
  ["16", "RWS_Tarot_16_Tower.jpg"],
  ["17", "RWS_Tarot_17_Star.jpg"],
  ["18", "RWS_Tarot_18_Moon.jpg"],
  ["19", "RWS_Tarot_19_Sun.jpg"],
  ["20", "RWS_Tarot_20_Judgement.jpg"],
  ["21", "RWS_Tarot_21_World.jpg"],
];

/* 小阿卡纳文件名（Wikimedia 上的实际命名） */
const SUIT_PREFIX = ["Wands", "Cups", "Swords", "Pents"];
const RANK_PREFIX = [
  "Ace",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "Page",
  "Knight",
  "Queen",
  "King",
];

const MINOR = [];
let n = 22;
for (const suit of SUIT_PREFIX) {
  for (const rank of RANK_PREFIX) {
    MINOR.push([String(n).padStart(2, "0"), `RWS_Tarot_${suit}_${rank}.jpg`]);
    n++;
  }
}

const FILES = [...MAJOR, ...MINOR];

const OUT = "public/tarot/default";

async function main() {
  await mkdir(OUT, { recursive: true });

  let ok = 0;
  let fail = 0;
  const failed = [];

  for (const [id, name] of FILES) {
    const url = COMMONS + encodeURIComponent(name);
    try {
      const r = await fetch(url, {
        redirect: "follow",
        headers: {
          /* Wikimedia 要求 UA，否则 403 */
          "User-Agent": "runwithme-tarot-fetcher/1.0 (personal)",
        },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 1000) throw new Error("文件太小");
      await writeFile(`${OUT}/${id}.jpg`, buf);
      console.log(`✓ ${id}.jpg  ${name}`);
      ok++;
    } catch (e) {
      console.log(`✗ ${id}  ${name}  (${e.message})`);
      failed.push(`${id}  ${name}`);
      fail++;
    }
    /* 礼貌一点，别被限速 */
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log("");
  console.log(`完成：成功 ${ok}，失败 ${fail}`);
  if (failed.length) {
    console.log("失败列表：");
    failed.forEach((f) => console.log("  " + f));
  }
}

main().catch(console.error);