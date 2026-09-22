"use client";

import { useRef, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import {
  parsePngCard,
  parseJsonCard,
  type ParsedCard,
} from "@/lib/ai/pngParser";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://api.yulewin.cn";

export default function CardImport({
  onImported,
}: {
  onImported: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [progress, setProgress] = useState<{
    cur: number;
    total: number;
  } | null>(null);

  async function handleFiles(files: FileList) {
    setBusy(true);
    setMsg("");
    const total = files.length;
    let ok = 0;
    let fail = 0;
    const failed: string[] = [];

    for (let i = 0; i < total; i++) {
      setProgress({ cur: i + 1, total });
      const f = files[i];
      try {
        let card: ParsedCard;
        const lower = f.name.toLowerCase();
        if (lower.endsWith(".png") || f.type === "image/png") {
          card = await parsePngCard(f);
        } else if (
          lower.endsWith(".json") ||
          f.type === "application/json"
        ) {
          card = await parseJsonCard(f);
        } else {
          fail++;
          failed.push(`${f.name}（不支持的类型）`);
          continue;
        }
        const r = await fetch(`${API_BASE}/api/ai/cards`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(card),
        });
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`);
        }
        ok++;
      } catch (e) {
        console.error("[import]", f.name, e);
        fail++;
        failed.push(
          `${f.name}（${
            e instanceof Error ? e.message : String(e)
          }）`
        );
      }
    }

    setBusy(false);
    setProgress(null);
    if (fail === 0) {
      setMsg(`导入完成：成功 ${ok} 张`);
    } else {
      setMsg(
        `导入完成：成功 ${ok}，失败 ${fail}。${
          failed.length <= 3 ? failed.join("；") : ""
        }`
      );
    }
    if (ok > 0) onImported();
    window.setTimeout(() => setMsg(""), 6000);
  }

  return (
    <>
      <button
        className="ai-btn primary"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {busy ? (
          <Loader2 size={14} className="ai-spin" />
        ) : (
          <Plus size={14} strokeWidth={2.4} />
        )}
        {busy ? "导入中…" : "导入角色卡"}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept=".png,.json,image/png,application/json"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          const fs = e.target.files;
          e.target.value = "";
          if (fs && fs.length) void handleFiles(fs);
        }}
      />

      {progress && (
        <div className="ai-import-progress">
          处理 {progress.cur} / {progress.total}
        </div>
      )}
      {msg && <div className="ai-import-msg">{msg}</div>}
    </>
  );
}