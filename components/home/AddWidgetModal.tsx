"use client";

import { useState } from "react";

import {
  Bookmark,
  BookOpen,
  CalendarClock,
  Disc3,
  Image as ImageIcon,
  Mail,
  User,
} from "lucide-react";

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
  type MusicWidget,
} from "@/data/home";

import { saveHomeFile } from "@/lib/homeFiles";

type Props = {
  onAdd: (item: HomeItem) => void;
  onClose: () => void;
};

type Mode = "menu" | "polaroid" | "countdown" | "study";

/* ---------- 复用：label 包裹的 file input ---------- */

function FileLabel({
  className,
  accept,
  label,
  fileName,
  onChange,
}: {
  className?: string;
  accept: string;
  label: string;
  fileName: string | null;
  onChange: (f: File | null) => void;
}) {
  return (
    <label
      className={
        "home-add-widget-file-btn " +
        (className ?? "")
      }
    >
      {fileName ? fileName : label}
      <input
        type="file"
        accept={accept}
        className="ios-file-input"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onChange(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}

export default function AddWidgetModal({
  onAdd,
  onClose,
}: Props) {
  const [mode, setMode] = useState<Mode>("menu");
  const [busy, setBusy] = useState(false);

  /* Polaroid */
  const [imageFile, setImageFile] = useState<File | null>(
    null
  );

  /* Countdown */
  const [countTitle, setCountTitle] = useState("");
  const [targetDate, setTargetDate] = useState(
    todayDateStr()
  );
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [leftFile, setLeftFile] = useState<File | null>(
    null
  );
  const [centerFile, setCenterFile] = useState<File | null>(
    null
  );
  const [rightFile, setRightFile] = useState<File | null>(
    null
  );

  /* Study */
  const [studyAvatarFile, setStudyAvatarFile] =
    useState<File | null>(null);
  const [studyBubble, setStudyBubble] = useState("");

  function resetAll() {
    setImageFile(null);
    setCountTitle("");
    setTargetDate(todayDateStr());
    setBgFile(null);
    setLeftFile(null);
    setCenterFile(null);
    setRightFile(null);
    setStudyAvatarFile(null);
    setStudyBubble("");
  }

  /* ---------- 添加：拍立得 ---------- */

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
        caption: "",
        dateLabel: "",
      };

      onAdd({
        id: createHomeItemId(),
        size: "4x4",
        content: { kind: "widget", widget },
      });

      onClose();
    } catch (e) {
      console.error("[AddWidget] 拍立得保存失败:", e);
      alert("保存图片失败。");
    } finally {
      setBusy(false);
    }
  }

  /* ---------- 添加：纪念日 ---------- */

  async function handleAddCountdown() {
    if (busy) return;
    setBusy(true);

    try {
      const widgetId = createWidgetId();
      const widget: CountdownWidget = {
        id: widgetId,
        type: "countdown",
        title: countTitle.trim() || "纪念日",
        targetDate,
      };

      if (bgFile) {
        const bgId = `anniv-bg-${widgetId}`;
        await saveHomeFile(bgId, bgFile);
        widget.backgroundImageId = bgId;
        console.log("[AddWidget] 已保存背景:", bgId);
      }
      if (leftFile) {
        const id = `anniv-left-${widgetId}`;
        await saveHomeFile(id, leftFile);
        widget.leftAvatarId = id;
        console.log("[AddWidget] 已保存左头像:", id);
      }
      if (centerFile) {
        const id = `anniv-center-${widgetId}`;
        await saveHomeFile(id, centerFile);
        widget.centerAvatarId = id;
        console.log("[AddWidget] 已保存中头像:", id);
      }
      if (rightFile) {
        const id = `anniv-right-${widgetId}`;
        await saveHomeFile(id, rightFile);
        widget.rightAvatarId = id;
        console.log("[AddWidget] 已保存右头像:", id);
      }

      console.log(
        "[AddWidget] 纪念日 widget 最终:",
        widget
      );

      onAdd({
        id: createHomeItemId(),
        size: "2x2",
        content: { kind: "widget", widget },
      });

      onClose();
    } catch (e) {
      console.error("[AddWidget] 纪念日保存失败:", e);
      alert("保存失败。");
    } finally {
      setBusy(false);
    }
  }

  /* ---------- 添加：学习 ---------- */

  async function handleAddStudy() {
    if (busy) return;
    setBusy(true);

    try {
      const widgetId = createWidgetId();
      const widget: StudyWidget = {
        id: widgetId,
        type: "study",
      };

      if (studyAvatarFile) {
        const id = `study-avatar-${widgetId}`;
        await saveHomeFile(id, studyAvatarFile);
        widget.avatarId = id;
        console.log("[AddWidget] 已保存学习头像:", id);
      }
      if (studyBubble.trim()) {
        widget.bubbleText = studyBubble.trim();
      }

      console.log(
        "[AddWidget] 学习 widget 最终:",
        widget
      );

      onAdd({
        id: createHomeItemId(),
        size: "4x2",
        content: { kind: "widget", widget },
      });

      onClose();
    } catch (e) {
      console.error("[AddWidget] 学习保存失败:", e);
      alert("保存失败。");
    } finally {
      setBusy(false);
    }
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

  function handleAddMusic() {
    const widget: MusicWidget = {
      id: createWidgetId(),
      type: "music",
    };
    onAdd({
      id: createHomeItemId(),
      size: "2x2",
      content: { kind: "widget", widget },
    });
    onClose();
  }

  function handleClose() {
    resetAll();
    onClose();
  }

  function goBackToMenu() {
    setMode("menu");
  }

  return (
    <div
      className="home-add-widget-backdrop"
      onClick={handleClose}
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
                : mode === "countdown"
                  ? "纪念日"
                  : "学习"}
          </h2>

          <button
            className="home-add-widget-close"
            onClick={mode === "menu" ? handleClose : goBackToMenu}
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
                <ImageIcon size={24} strokeWidth={1.7} />
              </span>
              <span className="home-add-widget-option-name">
                拍立得
              </span>
              <span className="home-add-widget-option-desc">
                4x4 · 纯图片
              </span>
            </button>

            <button
              className="home-add-widget-option"
              onClick={() => setMode("countdown")}
            >
              <span className="home-add-widget-option-icon">
                <CalendarClock
                  size={24}
                  strokeWidth={1.7}
                />
              </span>
              <span className="home-add-widget-option-name">
                纪念日
              </span>
              <span className="home-add-widget-option-desc">
                2x2 · 三头像 + 倒数日
              </span>
            </button>

            <button
              className="home-add-widget-option"
              onClick={handleAddLetter}
            >
              <span className="home-add-widget-option-icon">
                <Mail size={24} strokeWidth={1.7} />
              </span>
              <span className="home-add-widget-option-name">
                未读信
              </span>
              <span className="home-add-widget-option-desc">
                2x2 · 信封
              </span>
            </button>

            <button
              className="home-add-widget-option"
              onClick={() => setMode("study")}
            >
              <span className="home-add-widget-option-icon">
                <BookOpen size={24} strokeWidth={1.7} />
              </span>
              <span className="home-add-widget-option-name">
                今日学习
              </span>
              <span className="home-add-widget-option-desc">
                4x2 · 头像 + 气泡
              </span>
            </button>

            <button
              className="home-add-widget-option"
              onClick={handleAddDailyQuote}
            >
              <span className="home-add-widget-option-icon">
                <Bookmark size={24} strokeWidth={1.7} />
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
              onClick={handleAddMusic}
            >
              <span className="home-add-widget-option-icon">
                <Disc3 size={24} strokeWidth={1.7} />
              </span>
              <span className="home-add-widget-option-name">
                正在播放
              </span>
              <span className="home-add-widget-option-desc">
                2x2 · 一起听头像 · 播放器
              </span>
            </button>
          </div>
        )}

        {/* ---------- 拍立得 ---------- */}
        {mode === "polaroid" && (
          <div className="home-add-widget-form">
            <div className="home-add-widget-field">
              <span>照片（4x4 纯图片）</span>
              <FileLabel
                accept="image/*"
                label="选择图片"
                fileName={imageFile?.name ?? null}
                onChange={setImageFile}
              />
            </div>

            <div className="home-add-widget-footer">
              <button
                className="home-add-widget-btn ghost"
                onClick={goBackToMenu}
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

        {/* ---------- 纪念日 ---------- */}
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

            <div className="home-add-widget-field">
              <span>背景图（可选）</span>
              <FileLabel
                accept="image/*"
                label="选择背景图"
                fileName={bgFile?.name ?? null}
                onChange={setBgFile}
              />
            </div>

            <div className="home-add-widget-field">
              <span>三个头像（左 / 中 / 右，均可单独上传）</span>
              <div className="home-add-widget-avatar-row">
                <FileLabel
                  accept="image/*"
                  label="左"
                  fileName={leftFile?.name ?? null}
                  onChange={setLeftFile}
                />
                <FileLabel
                  accept="image/*"
                  label="中"
                  fileName={centerFile?.name ?? null}
                  onChange={setCenterFile}
                />
                <FileLabel
                  accept="image/*"
                  label="右"
                  fileName={rightFile?.name ?? null}
                  onChange={setRightFile}
                />
              </div>
            </div>

            <div className="home-add-widget-footer">
              <button
                className="home-add-widget-btn ghost"
                onClick={goBackToMenu}
              >
                返回
              </button>
              <button
                className="home-add-widget-btn"
                onClick={handleAddCountdown}
                disabled={busy}
              >
                {busy ? "保存中…" : "添加"}
              </button>
            </div>
          </div>
        )}

        {/* ---------- 学习 ---------- */}
        {mode === "study" && (
          <div className="home-add-widget-form">
            <div className="home-add-widget-field">
              <span>头像（可选）</span>
              <FileLabel
                accept="image/*"
                label="选择头像"
                fileName={studyAvatarFile?.name ?? null}
                onChange={setStudyAvatarFile}
              />
            </div>

            <label className="home-add-widget-field">
              <span>气泡文字</span>
              <input
                type="text"
                value={studyBubble}
                onChange={(e) =>
                  setStudyBubble(e.target.value)
                }
                placeholder="例如 今天也一起加油吧"
                maxLength={30}
              />
            </label>

            <div className="home-add-widget-footer">
              <button
                className="home-add-widget-btn ghost"
                onClick={goBackToMenu}
              >
                返回
              </button>
              <button
                className="home-add-widget-btn"
                onClick={handleAddStudy}
                disabled={busy}
              >
                {busy ? "保存中…" : "添加"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}