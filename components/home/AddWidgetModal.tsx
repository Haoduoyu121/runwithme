"use client";

import { useRef, useState } from "react";

import {
  createHomeItemId,
  createWidgetId,
  todayDateStr,
  type HomeItem,
  type PolaroidWidget,
  type CountdownWidget,
  type LetterWidget,
  type StudyWidget,
  type DailyQuoteWidget,
  type CollectionWidget,
} from "@/data/home";

import { saveHomeFile } from "@/lib/homeFiles";

type Props = {
  onAdd: (item: HomeItem) => void;
  onClose: () => void;
};

type Mode =
  | "menu"
  | "polaroid"
  | "countdown"
  | "letter"
  | "study";

export default function AddWidgetModal({
  onAdd,
  onClose,
}: Props) {
  const [mode, setMode] = useState<Mode>("menu");
  const [busy, setBusy] = useState(false);

  const [caption, setCaption] = useState("");
  const [dateLabel, setDateLabel] = useState(
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
    })
  );
  const [imageFile, setImageFile] = useState<File | null>(
    null
  );

  const [countTitle, setCountTitle] = useState("");
  const [targetDate, setTargetDate] = useState(
    todayDateStr()
  );

  const fileRef = useRef<HTMLInputElement | null>(null);

  async function handleAddPolaroid() {
    if (!imageFile || busy) return;

    setBusy(true);

    try {
      const widgetId = createWidgetId();
      const imageId = `polaroid-${widgetId}`;

      await saveHomeFile(imageId, imageFile);

      const widget: PolaroidWidget = {
        id: widgetId,
        type: "polaroid",
        imageId,
        caption: caption.trim(),
        dateLabel: dateLabel.trim(),
      };

      onAdd({
        id: createHomeItemId(),
        size: "2x2",
        content: { kind: "widget", widget },
      });

      onClose();
    } catch (e) {
      console.error(e);
      alert("保存图片失败。");
    } finally {
      setBusy(false);
    }
  }

  function handleAddCountdown() {
    const widget: CountdownWidget = {
      id: createWidgetId(),
      type: "countdown",
      title: countTitle.trim() || "Countdown",
      targetDate,
    };

    onAdd({
      id: createHomeItemId(),
      size: "2x2",
      content: { kind: "widget", widget },
    });

    onClose();
  }

  function handleAddLetter() {
    const widget: LetterWidget = {
      id: createWidgetId(),
      type: "letter",
    };

    onAdd({
      id: createHomeItemId(),
      size: "2x2",
      content: { kind: "widget", widget },
    });

    onClose();
  }

  function handleAddStudy() {
    const widget: StudyWidget = {
      id: createWidgetId(),
      type: "study",
    };

    onAdd({
      id: createHomeItemId(),
      size: "2x2",
      content: { kind: "widget", widget },
    });

    onClose();
  }

  function handleAddDailyQuote() {
    const widget: DailyQuoteWidget = {
      id: createWidgetId(),
      type: "daily-quote",
    };

    onAdd({
      id: createHomeItemId(),
      size: "2x2",
      content: { kind: "widget", widget },
    });

    onClose();
  }

  function handleAddCollection() {
    const widget: CollectionWidget = {
      id: createWidgetId(),
      type: "collection",
    };

    onAdd({
      id: createHomeItemId(),
      size: "2x2",
      content: { kind: "widget", widget },
    });

    onClose();
  }

  return (
    <div
      className="home-add-widget-backdrop"
      onClick={onClose}
    >
      <div
        className="home-add-widget"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="home-add-widget-header">
          <h2>
            {mode === "menu"
              ? "添加小组件"
              : mode === "polaroid"
                ? "拍立得"
                : "倒计时"}
          </h2>

          <button
            className="home-add-widget-close"
            onClick={
              mode === "menu"
                ? onClose
                : () => setMode("menu")
            }
            aria-label="关闭"
          >
            {mode === "menu" ? "×" : "‹"}
          </button>
        </div>

        {mode === "menu" && (
          <div className="home-add-widget-options">
            <button
              className="home-add-widget-option"
              onClick={() => setMode("polaroid")}
            >
              <span className="home-add-widget-option-icon">
                📷
              </span>
              <span className="home-add-widget-option-name">
                拍立得
              </span>
              <span className="home-add-widget-option-desc">
                照片 + 标题 + 日期
              </span>
            </button>

            <button
              className="home-add-widget-option"
              onClick={() => setMode("countdown")}
            >
              <span className="home-add-widget-option-icon">
                ⏳
              </span>
              <span className="home-add-widget-option-name">
                倒计时
              </span>
              <span className="home-add-widget-option-desc">
                距某天还有多久
              </span>
            </button>

            <button
              className="home-add-widget-option"
              onClick={handleAddLetter}
            >
              <span className="home-add-widget-option-icon">
                ✉
              </span>
              <span className="home-add-widget-option-name">
                未读信
              </span>
              <span className="home-add-widget-option-desc">
                未读数量 · 最近来信
              </span>
            </button>

            <button
              className="home-add-widget-option"
              onClick={handleAddStudy}
            >
              <span className="home-add-widget-option-icon">
                ✎
              </span>
              <span className="home-add-widget-option-name">
                今日学习
              </span>
              <span className="home-add-widget-option-desc">
                今日单词数 · 连续天数
              </span>
            </button>

            <button
              className="home-add-widget-option"
              onClick={handleAddDailyQuote}
            >
              <span className="home-add-widget-option-icon">
                ❝
              </span>
              <span className="home-add-widget-option-name">
                每日一句
              </span>
              <span className="home-add-widget-option-desc">
                今天的那一句
              </span>
            </button>

            <button
              className="home-add-widget-option"
              onClick={handleAddCollection}
            >
              <span className="home-add-widget-option-icon">
                ★
              </span>
              <span className="home-add-widget-option-name">
                收藏
              </span>
              <span className="home-add-widget-option-desc">
                收藏总数 · 今日新增
              </span>
            </button>
          </div>
        )}

        {mode === "polaroid" && (
          <div className="home-add-widget-form">
            <label className="home-add-widget-field">
              <span>照片</span>
              <button
                className="home-add-widget-file-btn"
                onClick={() => fileRef.current?.click()}
                type="button"
              >
                {imageFile ? imageFile.name : "选择图片"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="*/*"
                style={{
  position: "absolute",
  width: 1,
  height: 1,
  opacity: 0,
  overflow: "hidden",
}}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setImageFile(f);
                  e.target.value = "";
                }}
              />
            </label>

            <label className="home-add-widget-field">
              <span>标题</span>
              <input
                type="text"
                value={caption}
                onChange={(e) =>
                  setCaption(e.target.value)
                }
                placeholder="例如 summer"
                maxLength={24}
              />
            </label>

            <label className="home-add-widget-field">
              <span>日期标签</span>
              <input
                type="text"
                value={dateLabel}
                onChange={(e) =>
                  setDateLabel(e.target.value)
                }
                placeholder="例如 2026.09"
                maxLength={16}
              />
            </label>

            <div className="home-add-widget-footer">
              <button
                className="home-add-widget-btn ghost"
                onClick={() => setMode("menu")}
              >
                返回
              </button>
              <button
                className="home-add-widget-btn"
                onClick={handleAddPolaroid}
                disabled={!imageFile || busy}
              >
                {busy ? "保存中…" : "添加"}
              </button>
            </div>
          </div>
        )}

        {mode === "countdown" && (
          <div className="home-add-widget-form">
            <label className="home-add-widget-field">
              <span>标题</span>
              <input
                type="text"
                value={countTitle}
                onChange={(e) =>
                  setCountTitle(e.target.value)
                }
                placeholder="例如 RunWithme Anniversary"
                maxLength={30}
              />
            </label>

            <label className="home-add-widget-field">
              <span>目标日期</span>
              <input
                type="date"
                value={targetDate}
                onChange={(e) =>
                  setTargetDate(e.target.value)
                }
              />
            </label>

            <div className="home-add-widget-footer">
              <button
                className="home-add-widget-btn ghost"
                onClick={() => setMode("menu")}
              >
                返回
              </button>
              <button
                className="home-add-widget-btn"
                onClick={handleAddCountdown}
              >
                添加
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}