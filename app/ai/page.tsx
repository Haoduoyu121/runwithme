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
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/ai/cards`);
        const data = await r.json();
        setCards(data.cards || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
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

      {loading && <div className="ai-empty">Loading…</div>}
      {error && (
        <div className="ai-empty" style={{ color: "#c00" }}>
          {error}
        </div>
      )}
      {!loading && !error && cards.length === 0 && (
        <div className="ai-empty">
          还没有角色卡。下一步会做 PNG 导入。
        </div>
      )}
      {cards.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 16,
          }}
        >
          {cards.map((c) => (
            <Link
              key={c.id}
              href={`/ai/chat/${c.id}`}
              style={{
                textDecoration: "none",
                color: "inherit",
                border: "1px solid var(--ai-border)",
                borderRadius: "var(--ai-radius)",
                padding: 14,
                background: "var(--ai-surface)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background: c.avatar
                    ? `url(${c.avatar}) center/cover`
                    : "var(--ai-border)",
                  alignSelf: "center",
                }}
              />
              <div
                style={{
                  textAlign: "center",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {c.name}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}