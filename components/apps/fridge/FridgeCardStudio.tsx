"use client";

import { useState } from "react";
import { Plus, RotateCcw, X } from "lucide-react";

import {
  createFridgeCardId,
  type FridgeCard,
} from "@/data/fridgeDoor";

import {
  loadFridgeCards,
  resetFridgeCards,
  saveFridgeCards,
} from "@/lib/fridgeDoorStorage";

import {
  DEFAULT_SIGNATURES,
  loadSignatures,
  resetSignatures,
  saveSignatures,
  type FridgeSignatures,
} from "@/lib/fridgeSignatureStorage";

import { FRIDGE_STICKER_FILES } from "@/data/fridgeStickerFiles";

type Props = { onClose: () => void };

type Owner = "levi" | "erwin";
type SubTab = "cards" | "signatures";

export default function FridgeCardStudio({
  onClose,
}: Props) {
  const [tab, setTab] = useState<Owner>("levi");
  const [subTab, setSubTab] = useState<SubTab>("cards");

  const [cards, setCards] = useState<FridgeCard[]>(() =>
    loadFridgeCards()
  );
  const [signatures, setSignatures] =
    useState<FridgeSignatures>(() => loadSignatures());

  const [newKind, setNewKind] = useState<
    "sticker" | "note"
  >("note");
  const [newText, setNewText] = useState("");
  const [newImage, setNewImage] = useState(
    FRIDGE_STICKER_FILES[0] ?? ""
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  const [newSig, setNewSig] = useState("");

  function persistCards(next: FridgeCard[]) {
    setCards(next);
    saveFridgeCards(next);
  }

  function persistSignatures(next: FridgeSignatures) {
    setSignatures(next);
    saveSignatures(next);
  }

  function handleAddCard() {
    if (newKind === "note") {
      const t = newText.trim();
      if (!t) return;
      persistCards([
        ...cards,
        {
          id: createFridgeCardId(),
          owner: tab,
          kind: "note",
          text: t,
          enabled: true,
        },
      ]);
      setNewText("");
    } else {
      if (!newImage) return;
      persistCards([
        ...cards,
        {
          id: createFridgeCardId(),
          owner: tab,
          kind: "sticker",
          imageUrl: `/fridge-stickers/${newImage}.svg`,
          enabled: true,
        },
      ]);
    }
  }

  function handleToggleCard(id: string) {
    persistCards(
      cards.map((c) =>
        c.id === id ? { ...c, enabled: !c.enabled } : c
      )
    );
  }

  function handleDeleteCard(id: string) {
    persistCards(cards.filter((c) => c.id !== id));
  }

  function handleResetCards() {
    if (!window.confirm("恢复默认卡池？"))
      return;
    resetFridgeCards();
    setCards(loadFridgeCards());
  }

  function handleAddSignature() {
    const t = newSig.trim();
    if (!t) return;
    persistSignatures({
      ...signatures,
      [tab]: [...signatures[tab], t],
    });
    setNewSig("");
  }

  function handleDeleteSignature(idx: number) {
    const list = signatures[tab].filter(
      (_, i) => i !== idx
    );
    if (list.length === 0) {
      alert("至少保留一个署名");
      return;
    }
    persistSignatures({ ...signatures, [tab]: list });
  }

  function handleResetSignatures() {
    if (!window.confirm("恢复默认署名？")) return;
    resetSignatures();
    setSignatures({ ...DEFAULT_SIGNATURES });
  }

  const list = cards.filter((c) => c.owner === tab);
  const sigList = signatures[tab];

  return (
    <div className="fridge-cs-backdrop" onClick={onClose}>
      <div
        className="fridge-cs-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fridge-cs-header">
          <h2>冰箱卡池</h2>
          <button
            className="fridge-cs-close"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        <div className="fridge-cs-tabs">
          <button
            className={tab === "levi" ? "active" : ""}
            onClick={() => setTab("levi")}
          >
            Levi
          </button>
          <button
            className={tab === "erwin" ? "active" : ""}
            onClick={() => setTab("erwin")}
          >
            Erwin
          </button>
        </div>

        <div className="fridge-cs-subtabs">
          <button
            className={subTab === "cards" ? "active" : ""}
            onClick={() => setSubTab("cards")}
          >
            便利贴内容
          </button>
          <button
            className={subTab === "signatures" ? "active" : ""}
            onClick={() => setSubTab("signatures")}
          >
            署名池
          </button>
        </div>

        {subTab === "cards" && (
          <>
            <div className="fridge-cs-kind">
              <button
                className={
                  newKind === "note" ? "active" : ""
                }
                onClick={() => setNewKind("note")}
                type="button"
              >
                便利贴
              </button>
              <button
                className={
                  newKind === "sticker" ? "active" : ""
                }
                onClick={() => setNewKind("sticker")}
                type="button"
              >
                冰箱贴
              </button>
            </div>

            <div className="fridge-cs-add">
              {newKind === "note" ? (
                <input
                  type="text"
                  value={newText}
                  onChange={(e) =>
                    setNewText(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCard();
                    }
                  }}
                  placeholder={`${tab} 会写的便利贴`}
                  maxLength={40}
                />
              ) : (
                <>
                  <button
                    className="fridge-cs-pickimg"
                    onClick={() =>
                      setPickerOpen((v) => !v)
                    }
                    type="button"
                  >
                    {newImage ? (
                      <img
                        src={`/fridge-stickers/${newImage}.svg`}
                        alt=""
                      />
                    ) : (
                      "选图"
                    )}
                  </button>
                  {pickerOpen && (
                    <div className="fridge-cs-imgpicker">
                      {FRIDGE_STICKER_FILES.map(
                        (name) => (
                          <button
                            key={name}
                            onClick={() => {
                              setNewImage(name);
                              setPickerOpen(false);
                            }}
                            type="button"
                          >
                            <img
                              src={`/fridge-stickers/${name}.svg`}
                              alt={name}
                            />
                          </button>
                        )
                      )}
                    </div>
                  )}
                </>
              )}
              <button
                className="fridge-cs-addbtn"
                onClick={handleAddCard}
                type="button"
              >
                <Plus size={14} strokeWidth={2.6} />
                加
              </button>
            </div>

            <div className="fridge-cs-list">
              {list.length === 0 ? (
                <div className="fridge-cs-empty">
                  还没有卡片
                </div>
              ) : (
                list.map((c) => (
                  <div
                    key={c.id}
                    className={`fridge-cs-item${
                      c.enabled ? "" : " is-disabled"
                    }`}
                  >
                    {c.kind === "sticker" ? (
                      <img
                        className="fridge-cs-thumb"
                        src={c.imageUrl}
                        alt=""
                      />
                    ) : (
                      <div className="fridge-cs-thumbtext">
                        {c.text}
                      </div>
                    )}
                    <button
                      className="fridge-cs-toggle"
                      onClick={() =>
                        handleToggleCard(c.id)
                      }
                      type="button"
                    >
                      {c.enabled ? "停用" : "启用"}
                    </button>
                    <button
                      className="fridge-cs-delete"
                      onClick={() =>
                        handleDeleteCard(c.id)
                      }
                      type="button"
                      aria-label="删除"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {subTab === "signatures" && (
          <>
            <div className="fridge-cs-add">
              <input
                type="text"
                value={newSig}
                onChange={(e) =>
                  setNewSig(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSignature();
                  }
                }}
                placeholder={`新增 ${tab} 的署名`}
                maxLength={16}
              />
              <button
                className="fridge-cs-addbtn"
                onClick={handleAddSignature}
                type="button"
              >
                <Plus size={14} strokeWidth={2.6} />
                加
              </button>
            </div>

            <div className="fridge-cs-list">
              {sigList.length === 0 ? (
                <div className="fridge-cs-empty">
                  还没有署名
                </div>
              ) : (
                sigList.map((sig, idx) => (
                  <div
                    key={`${sig}-${idx}`}
                    className="fridge-cs-item"
                  >
                    <div className="fridge-cs-sigtext">
                      {sig}
                    </div>
                    <button
                      className="fridge-cs-delete"
                      onClick={() =>
                        handleDeleteSignature(idx)
                      }
                      type="button"
                      aria-label="删除"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        <div className="fridge-cs-footer">
          <button
            className="fridge-cs-reset"
            onClick={
              subTab === "cards"
                ? handleResetCards
                : handleResetSignatures
            }
            type="button"
          >
            <RotateCcw size={12} strokeWidth={2.2} />
            恢复默认
          </button>
          <button
            className="fridge-cs-done"
            onClick={onClose}
            type="button"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}