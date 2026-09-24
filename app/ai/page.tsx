"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import CardImport from "@/components/ai/CardImport";
import WorldbookPanel from "@/components/ai/WorldbookPanel";
import PresetPanel from "@/components/ai/PresetPanel";
import CardEditPanel, {
  type EditableCard,
} from "@/components/ai/CardEditPanel";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://api.yulewin.cn";

type CardRow = {
  id: string;
  name: string;
  avatar?: string | null;
  payload?: EditableCard["payload"];
  updatedAt: number;
};

export default function AiHomePage() {
  const [cards, setCards] = useState<CardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGlobalWb, setShowGlobalWb] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  const [menuCardId, setMenuCardId] = useState<string | null>(
    null
  );
  const [editingCard, setEditingCard] =
    useState<EditableCard | null>(null);

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

  /* 点空白关闭菜单 */
  useEffect(() => {
    function onClick() {
      setMenuCardId(null);
    }
    if (menuCardId !== null) {
      window.addEventListener("click", onClick);
      return () =>
        window.removeEventListener("click", onClick);
    }
  }, [menuCardId]);

  function openEdit(c: CardRow) {
    setEditingCard({
      id: c.id,
      name: c.name,
      avatar: c.avatar,
      payload: {
        description: c.payload?.description || "",
        personality: c.payload?.personality || "",
        scenario: c.payload?.scenario || "",
        first_mes: c.payload?.first_mes || "",
        mes_example: c.payload?.mes_example || "",
        creator_notes: c.payload?.creator_notes || "",
        system_prompt: c.payload?.system_prompt || "",
        character_book: c.payload?.character_book,
      },
    });
  }

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
        <button
          className="ai-btn"
          onClick={() => setShowGlobalWb(true)}
          style={{ display: "inline-flex", alignItems: "center" }}
        >
          🌍 全局世界书
        </button>
        <button
          className="ai-btn"
          onClick={() => setShowPresets(true)}
          style={{ display: "inline-flex", alignItems: "center" }}
        >
          ⚙ 预设
        </button>
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
            <div key={c.id} className="ai-card-wrap">
              <Link
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

              <button
                className="ai-card-menu-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setMenuCardId(
                    menuCardId === c.id ? null : c.id
                  );
                }}
                aria-label="更多"
              >
                <MoreHorizontal size={14} strokeWidth={2.4} />
              </button>

              {menuCardId === c.id && (
                <div
                  className="ai-card-menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="ai-card-menu-item"
                    onClick={() => {
                      openEdit(c);
                      setMenuCardId(null);
                    }}
                  >
                    编辑
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showGlobalWb && (
        <WorldbookPanel
          cardId="__global__"
          onClose={() => setShowGlobalWb(false)}
        />
      )}

      {showPresets && (
        <PresetPanel
          onClose={() => setShowPresets(false)}
          onChanged={() => {
            /* 首页不用刷新 */
          }}
        />
      )}

      {editingCard && (
        <CardEditPanel
          card={editingCard}
          onClose={() => setEditingCard(null)}
          onSaved={refresh}
          onDeleted={refresh}
        />
      )}
    </div>
  );
}