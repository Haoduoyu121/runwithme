"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  Palette,
  Settings2,
  X,
} from "lucide-react";

import {
  loadDoodles,
  loadFonts,
  saveFonts,
} from "@/lib/fridgeStorage";

import WhiteBoard from "@/components/apps/fridge/WhiteBoard";
import FridgeDoorLower from "@/components/apps/fridge/FridgeDoorLower";
import FridgeCardStudio from "@/components/apps/fridge/FridgeCardStudio";
import { runFridgeDoorSystemCheck } from "@/lib/fridgeDoorScheduler";
import {
  loadFridgeDoorItems,
  cleanupExpiredItems,
} from "@/lib/fridgeDoorStorage";
import type { FridgeDoorItem } from "@/data/fridgeDoor";

import type {
  Doodle,
  FridgeCharacter,
  FridgeFonts,
} from "@/data/fridge";

type FridgeAppProps = { onBack: () => void };

const ROLE_LABEL: Record<FridgeCharacter, string> = {
  user: "我",
  levi: "Levi",
  erwin: "Erwin",
};

export default function FridgeApp({
  onBack,
}: FridgeAppProps) {
  const [doodles, setDoodles] = useState<Doodle[]>([]);
  const [fonts, setFonts] = useState<FridgeFonts>({
    user: "",
    levi: "",
    erwin: "",
  });
  const [showFontPanel, setShowFontPanel] = useState(false);
  const [doorItems, setDoorItems] = useState<FridgeDoorItem[]>([]);
  const [showCardStudio, setShowCardStudio] = useState(false);

  useEffect(() => {
    setDoodles(loadDoodles());
    setFonts(loadFonts());
  }, []);

  useEffect(() => {
    let list = cleanupExpiredItems();
    setDoorItems(list);

    const newItem = runFridgeDoorSystemCheck();
    if (newItem) {
      list = loadFridgeDoorItems();
      setDoorItems(list);
    }
  }, []);

  useEffect(() => {
    const STYLE_ID = "runwithme-fridge-fonts";
    let el = document.getElementById(
      STYLE_ID
    ) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    const css = `
      ${
        fonts.user
          ? `@font-face { font-family: "FridgeUserFont"; src: url("${fonts.user}"); }`
          : ""
      }
      ${
        fonts.levi
          ? `@font-face { font-family: "FridgeLeviFont"; src: url("${fonts.levi}"); }`
          : ""
      }
      ${
        fonts.erwin
          ? `@font-face { font-family: "FridgeErwinFont"; src: url("${fonts.erwin}"); }`
          : ""
      }
    `;
    el.textContent = css;
  }, [fonts.user, fonts.levi, fonts.erwin]);

  function updateFont(role: FridgeCharacter, url: string) {
    const next = { ...fonts, [role]: url.trim() };
    setFonts(next);
    saveFonts(next);
  }

  return (
    <main className="phone-screen app-screen fridge-app">
      <header className="fridge-header">
        <button
          className="fridge-back"
          onClick={onBack}
          aria-label="返回"
        >
          <ChevronLeft size={24} strokeWidth={2.4} />
        </button>
        <div className="fridge-title">冰箱</div>
        <button
          className="fridge-settings"
          onClick={() => setShowFontPanel(true)}
          aria-label="字体设置"
        >
          <Settings2 size={18} strokeWidth={2.2} />
        </button>
        <button
          className="fridge-settings"
          onClick={() => setShowCardStudio(true)}
          aria-label="卡池设置"
        >
          <Palette size={18} strokeWidth={2.2} />
        </button>
      </header>

      <div className="fridge-body">
        <div className="fridge-door">
          <WhiteBoard
            doodles={doodles}
            fonts={fonts}
            onChange={setDoodles}
          />
          <FridgeDoorLower
            items={doorItems}
            fonts={fonts}
            onChange={setDoorItems}
          />
        </div>
      </div>

      {showFontPanel && (
        <div
          className="fridge-font-backdrop"
          onClick={() => setShowFontPanel(false)}
        >
          <div
            className="fridge-font-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fridge-font-header">
              <h2>手写字体</h2>
              <button
                onClick={() => setShowFontPanel(false)}
                aria-label="关闭"
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>

            <p className="fridge-font-hint">
              粘贴 TTF 直链 URL。三个人可以各用一个字体。
            </p>

            {(
              ["user", "levi", "erwin"] as FridgeCharacter[]
            ).map((role) => (
              <label
                key={role}
                className="fridge-font-field"
              >
                <span>{ROLE_LABEL[role]}</span>
                <input
                  type="text"
                  value={fonts[role]}
                  onChange={(e) =>
                    updateFont(role, e.target.value)
                  }
                  placeholder="https://.../font.ttf"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
            ))}

            <div className="fridge-font-footer">
              <button
                className="fridge-font-done"
                onClick={() => setShowFontPanel(false)}
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      {showCardStudio && (
        <FridgeCardStudio
          onClose={() => setShowCardStudio(false)}
        />
      )}
    </main>
  );
}