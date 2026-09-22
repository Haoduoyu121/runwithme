"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/ai/cards`);
        const data = await r.json();
        setCards(data.cards || []);
      } catch {
        /* 忽略 */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="ai-home">
      <h1 className="ai-home-title">Beyond the Pages</h1>
      <p className="ai-home-sub">
        Stories outside the walls. Fill in your imagination.
      </p>

      <div className="ai-section-title">试用</div>
      <div className="ai-card-grid" style={{ marginBottom: 32 }}>
        <Link href="/ai/chat/__demo__" className="ai-card">
          <div
            className="ai-card-avatar"
            style={{
              background:
                "linear-gradient(135deg, #8b6b3d, #5b8ff9)",
            }}
          >
            ✦
          </div>
          <div className="ai-card-name">试用角色</div>
          <div className="ai-card-desc">跑通链路用</div>
        </Link>
      </div>

      <div className="ai-section-title">角色卡</div>
      {loading && <div className="ai-empty">Loading…</div>}
      {!loading && cards.length === 0 && (
        <div className="ai-empty">
          还没有角色卡。下一步做 PNG 导入。
        </div>
      )}
      {cards.length > 0 && (
        <div className="ai-card-grid">
          {cards.map((c) => (
            <Link
              key={c.id}
              href={`/ai/chat/${c.id}`}
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