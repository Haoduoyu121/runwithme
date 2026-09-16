"use client";

import { useEffect, useState } from "react";

import {
  cards as defaultCards,
  type CharacterCard,
} from "@/data/cards";

import { loadCards, saveCards } from "@/lib/storage";

import { MUSIC_CATEGORY } from "@/lib/musicChatReply";

type MusicChatSettingsProps = {
  onClose: () => void;
};

function createId() {
  return `card-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export default function MusicChatSettings({
  onClose,
}: MusicChatSettingsProps) {
  const [cards, setCards] = useState<CharacterCard[]>([]);
  const [draftCharacter, setDraftCharacter] =
    useState<"Levi" | "Erwin">("Levi");
  const [draftText, setDraftText] = useState("");

  useEffect(() => {
    const all = loadCards(defaultCards);
    setCards(
      all.filter((c) => c.category === MUSIC_CATEGORY)
    );
  }, []);

  function commit(nextMusicCards: CharacterCard[]) {
    const all = loadCards(defaultCards);
    const others = all.filter(
      (c) => c.category !== MUSIC_CATEGORY
    );
    const merged = [...others, ...nextMusicCards];
    saveCards(merged);
    setCards(nextMusicCards);
  }

  function addCard() {
    const text = draftText.trim();
    if (!text) return;

    const lines = text
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const newCards: CharacterCard[] = lines.map(
      (line) => ({
        id: createId(),
        character: draftCharacter,
        type: "text",
        category: MUSIC_CATEGORY,
        text: line,
        enabled: true,
      })
    );

    commit([...cards, ...newCards]);
    setDraftText("");
  }

  function toggleEnabled(id: string) {
    commit(
      cards.map((c) =>
        c.id === id ? { ...c, enabled: !c.enabled } : c
      )
    );
  }

  function deleteCard(id: string) {
    if (!window.confirm("删除这张卡片？")) return;
    commit(cards.filter((c) => c.id !== id));
  }

  function updateText(id: string, text: string) {
    commit(
      cards.map((c) => (c.id === id ? { ...c, text } : c))
    );
  }

  return (
    <div
      className="music-chat-settings-backdrop"
      onClick={onClose}
    >
      <div
        className="music-chat-settings"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="music-chat-settings-header">
          <h2>一起听 · 卡片设置</h2>
          <button onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="music-chat-settings-add">
          <div className="music-chat-settings-add-row">
            <select
              value={draftCharacter}
              onChange={(e) =>
                setDraftCharacter(
                  e.target.value as "Levi" | "Erwin"
                )
              }
            >
              <option value="Levi">Levi</option>
              <option value="Erwin">Erwin</option>
            </select>
            <button
              onClick={addCard}
              disabled={!draftText.trim()}
            >
              添加卡片
            </button>
          </div>

          <textarea
            value={draftText}
            onChange={(e) =>
              setDraftText(e.target.value)
            }
            placeholder={
              "每行一条卡片\n一起听时随机抽一条回复\n\n例如：\n这首歌我喜欢。\n你选的歌不错。\n音量小一点。"
            }
            rows={4}
          />
        </div>

        <div className="music-chat-settings-hint">
          只有分类为「music」的卡片会在一起听聊天里出现。
          也可以在 Card Studio 里手动创建（分类填 music）。
        </div>

        <div className="music-chat-settings-list">
          {cards.length === 0 ? (
            <div className="music-chat-settings-empty">
              还没有 music 卡片，上面添加一条
            </div>
          ) : (
            cards.map((c) => (
              <div
                key={c.id}
                className={`music-chat-settings-item${
                  c.enabled ? "" : " is-disabled"
                }`}
              >
                <span
                  className={`music-chat-settings-badge badge-${c.character.toLowerCase()}`}
                >
                  {c.character}
                </span>

                <input
                  value={c.text}
                  onChange={(e) =>
                    updateText(c.id, e.target.value)
                  }
                />

                <button
                  onClick={() => toggleEnabled(c.id)}
                >
                  {c.enabled ? "停用" : "启用"}
                </button>

                <button
                  className="danger"
                  onClick={() => deleteCard(c.id)}
                >
                  删除
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}