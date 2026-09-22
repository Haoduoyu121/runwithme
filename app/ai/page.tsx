"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import CardImport from "@/components/ai/CardImport";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://api.yulewin.cn";

type CardRow = {
  id: string;
  name: string;
  avatar?: string | null;
  updatedAt: number;
};

export default function AiHomePage() {
  const [cards, setCards] = useState<CardRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/ai/cards`);
      const data = await r.json();
      setCards(data.cards || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="ai-home">
      <div className="ai-home-header">
        <div>
          <h1 className="ai-home-title">Beyond the Pages</h1>
          <p className="ai-home-sub">
            Stories outside the walls. Fill in your
            imagination.
          </p>
        </div>
      </div>

      <div className="ai-home-actions">
        <CardImport onImported={refresh} />
      </div>

      <div className="ai-section-title">角色卡</div>

      {loading && <div className="ai-empty">Loading…</div>}

      {!loading && cards.length === 0 && (
        <div className="ai-empty">
          还没有角色卡。点上面的「导入角色卡」上传 PNG
          或 JSON。
        </div>
      )}

      {cards.length > 0 && (
        <div className="ai-card-grid">
          {cards.map((c) => (
            <Link
              key={c.id}
              href={`/ai/chat?id=${encodeURIComponent(c.id)}`}
              className="ai-card"
            >
              <div
                className="ai-card-avatar"
                style={{
                  background: c.avatar
                    ? `url(${c.avatar}) center/cover`
                    : "var(--ai-border)",
                }}
              />
              <div className="ai-card-name">{c.name}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}