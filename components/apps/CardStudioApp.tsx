"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";

import {
  cards as defaultCards,
  type CharacterCard,
  type CardCharacter,
  type CardType,
} from "@/data/cards";

import { loadCards, saveCards } from "@/lib/storage";

import {
  loadCategories,
  saveCategories,
} from "@/lib/categoryStorage";

import {
  saveStickerFile,
  deleteStickerFile,
  getStickerFile,
} from "@/lib/stickerFiles";

import {
  saveVoiceFile,
  deleteVoiceFile,
  getVoiceFile,
} from "@/lib/voiceFiles";

import CategoryEditor from "@/components/apps/card/CategoryEditor";

type CardStudioAppProps = {
  onBack: () => void;
};

type FilterCharacter = "All" | CardCharacter;
type FilterType = "All" | CardType;

const CHARACTER_OPTIONS: CardCharacter[] = [
  "Levi",
  "Erwin",
  "Shared",
];

const TYPE_OPTIONS: {
  value: CardType;
  label: string;
}[] = [
  { value: "text", label: "💬 Text" },
  { value: "voice", label: "🎙️ Voice" },
  { value: "sticker", label: "🧸 Sticker" },
  { value: "pat", label: "👋 Pat（拍一拍）" },
  { value: "emoji", label: "✨ Emoji" },
];

function createCardId() {
  return `card-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function createMediaId(type: "voice" | "sticker") {
  return `${type}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function getTypeLabel(type: CardType) {
  return (
    TYPE_OPTIONS.find((t) => t.value === type)?.label ??
    type
  );
}

function getCharacterLabel(c: CardCharacter) {
  if (c === "Shared") return "Shared";
  return c;
}

function splitTextLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function CardStudioApp({
  onBack,
}: CardStudioAppProps) {
  const [cardPool, setCardPool] = useState<CharacterCard[]>(
    []
  );

  const [categories, setCategories] = useState<string[]>(
    []
  );

  const [characterFilter, setCharacterFilter] =
    useState<FilterCharacter>("All");

  const [typeFilter, setTypeFilter] =
    useState<FilterType>("All");

  const [categoryFilter, setCategoryFilter] =
    useState("全部");

  const [selectedIds, setSelectedIds] = useState<string[]>(
    []
  );

  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showCategoryEditor, setShowCategoryEditor] =
    useState(false);

  const [addType, setAddType] = useState<CardType>("text");
  const [addCharacter, setAddCharacter] =
    useState<CardCharacter>("Levi");
  const [addCategory, setAddCategory] = useState("");
  const [addText, setAddText] = useState("");
  const [addFile, setAddFile] = useState<File | null>(null);

  const [editingCard, setEditingCard] =
    useState<CharacterCard | null>(null);
  const [editCharacter, setEditCharacter] =
    useState<CardCharacter>("Levi");
  const [editCategory, setEditCategory] = useState("");
  const [editText, setEditText] = useState("");
  const [editEnabled, setEditEnabled] = useState(true);

  const [mediaUrls, setMediaUrls] = useState<
    Record<string, string>
  >({});
  const [playingId, setPlayingId] = useState<string | null>(
    null
  );
  const [audioElement, setAudioElement] =
    useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    setCardPool(loadCards(defaultCards));

    const cats = loadCategories();
    setCategories(cats);

    if (cats.length > 0) {
      setAddCategory(cats[0]);
      setEditCategory(cats[0]);
    }
  }, []);

  function updateCards(nextCards: CharacterCard[]) {
    setCardPool(nextCards);
    saveCards(nextCards);
  }

  function updateCategories(next: string[]) {
    setCategories(next);
    saveCategories(next);

    if (next.length > 0) {
      if (!next.includes(addCategory)) {
        setAddCategory(next[0]);
      }
      if (!next.includes(editCategory)) {
        setEditCategory(next[0]);
      }
    } else {
      setAddCategory("");
      setEditCategory("");
    }
  }

  /* -------------------------------------------------------
     媒体预览加载
     ★ 修复：每次重新加载时，先把旧的 URL 全部 revoke
     ------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    async function loadMediaPreviews() {
      const nextUrls: Record<string, string> = {};

      for (const card of cardPool) {
        if (
          card.type !== "voice" &&
          card.type !== "sticker"
        ) {
          continue;
        }

        if (!card.mediaId) continue;

        try {
          const file =
            card.type === "voice"
              ? await getVoiceFile(card.mediaId)
              : await getStickerFile(card.mediaId);

          if (!file) {
            console.warn(
              "[CardStudio] 找不到媒体文件:",
              card.mediaId
            );
            continue;
          }

          if (cancelled) return;

          nextUrls[card.id] = URL.createObjectURL(file);
        } catch (error) {
          console.error("读取媒体文件失败:", error);
        }
      }

      if (cancelled) {
        Object.values(nextUrls).forEach((url) =>
          URL.revokeObjectURL(url)
        );
        return;
      }

      /* ★ 替换前先 revoke 旧 URL，避免内存泄漏 */
      setMediaUrls((prev) => {
        Object.values(prev).forEach((url) => {
          if (
            !Object.values(nextUrls).includes(url)
          ) {
            URL.revokeObjectURL(url);
          }
        });
        return nextUrls;
      });
    }

    if (cardPool.length > 0) {
      void loadMediaPreviews();
    } else {
      setMediaUrls((prev) => {
        Object.values(prev).forEach((url) =>
          URL.revokeObjectURL(url)
        );
        return {};
      });
    }

    return () => {
      cancelled = true;
    };
  }, [cardPool]);

  useEffect(() => {
    return () => {
      Object.values(mediaUrls).forEach((url) =>
        URL.revokeObjectURL(url)
      );

      if (audioElement) {
        audioElement.pause();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------------------------------------
     iOS 安全：立即把文件读进内存
     ------------------------------------------------------- */

  function handleAddFile(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setAddFile(null);
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const buf = reader.result as ArrayBuffer;

        const nameLower = (
          file.name || ""
        ).toLowerCase();

        let type = file.type;

        if (!type) {
          if (nameLower.endsWith(".mp3"))
            type = "audio/mpeg";
          else if (nameLower.endsWith(".m4a"))
            type = "audio/mp4";
          else if (nameLower.endsWith(".wav"))
            type = "audio/wav";
          else if (nameLower.endsWith(".aac"))
            type = "audio/aac";
          else if (nameLower.endsWith(".ogg"))
            type = "audio/ogg";
          else if (nameLower.endsWith(".opus"))
            type = "audio/opus";
          else if (nameLower.endsWith(".png"))
            type = "image/png";
          else if (
            nameLower.endsWith(".jpg") ||
            nameLower.endsWith(".jpeg")
          )
            type = "image/jpeg";
          else type = "application/octet-stream";
        }

        const fresh = new File(
          [buf],
          file.name || "upload",
          { type }
        );

        setAddFile(fresh);
        event.target.value = "";
      } catch (e) {
        console.error("读取文件失败:", e);
        alert("读取文件失败，请重试。");
        setAddFile(null);
      }
    };

    reader.onerror = () => {
      console.error("读取文件失败:", reader.error);
      alert("读取文件失败，请重试。");
      setAddFile(null);
    };

    reader.readAsArrayBuffer(file);
  }

  /* -------------------------------------------------------
     添加
     ------------------------------------------------------- */

  async function addCard() {
    if (addType === "text") {
      const lines = splitTextLines(addText);

      if (lines.length === 0) {
        alert("请填写至少一行内容。");
        return;
      }

      const newCards: CharacterCard[] = lines.map(
        (line) => ({
          id: createCardId(),
          character: addCharacter,
          type: "text",
          category: addCategory,
          text: line,
          enabled: true,
        })
      );

      updateCards([...cardPool, ...newCards]);
      resetAddForm();
      return;
    }

    if (addType === "pat") {
      const lines = splitTextLines(addText);

      if (lines.length === 0) {
        alert("请填写至少一行拍一拍内容。");
        return;
      }

      const newCards: CharacterCard[] = lines.map(
        (line) => ({
          id: createCardId(),
          character: addCharacter,
          type: "pat",
          category: addCategory,
          text: line,
          enabled: true,
        })
      );

      updateCards([...cardPool, ...newCards]);
      resetAddForm();
      return;
    }

    if (addType === "emoji") {
      const lines = splitTextLines(addText);

      if (lines.length === 0) {
        alert("请填写至少一个 emoji。");
        return;
      }

      const newCards: CharacterCard[] = lines.map(
        (line) => ({
          id: createCardId(),
          character: "Shared",
          type: "emoji",
          category: addCategory,
          text: line,
          enabled: true,
        })
      );

      updateCards([...cardPool, ...newCards]);
      resetAddForm();
      return;
    }

    /* Voice */
    if (addType === "voice") {
      const text = addText.trim();

      if (!addFile) {
        alert("请先选择音频文件。");
        return;
      }

      const nameLower = addFile.name.toLowerCase();
      const isAudioByName =
        nameLower.endsWith(".mp3") ||
        nameLower.endsWith(".m4a") ||
        nameLower.endsWith(".wav") ||
        nameLower.endsWith(".aac") ||
        nameLower.endsWith(".ogg") ||
        nameLower.endsWith(".opus");

      const isAudioByType = addFile.type
        .toLowerCase()
        .startsWith("audio/");

      if (!isAudioByName && !isAudioByType) {
        alert(
          "只接受音频文件（mp3 / m4a / wav / aac / ogg / opus）。\n" +
            `当前文件：${addFile.name || "(无文件名)"}\n` +
            `类型：${addFile.type || "(未知)"}`
        );
        return;
      }

      if (!text) {
        alert("请填写这条语音的文字稿。");
        return;
      }

      const mediaId = createMediaId("voice");

      try {
        await saveVoiceFile(mediaId, addFile);

        const newCard: CharacterCard = {
          id: createCardId(),
          character: addCharacter,
          type: "voice",
          category: addCategory,
          text,
          mediaId,
          fileName: addFile.name,
          enabled: true,
        };

        updateCards([...cardPool, newCard]);
        resetAddForm();
      } catch (error) {
        console.error("保存语音失败:", error);
        alert("语音保存失败，请查看控制台。");
      }

      return;
    }

    /* Sticker */
    if (addType === "sticker") {
      const text = addText.trim();

      if (!addFile) {
        alert("请先选择图片。");
        return;
      }

      if (
        !["image/jpeg", "image/png"].includes(addFile.type)
      ) {
        alert("目前只接受 JPG / PNG 图片。");
        return;
      }

      const mediaId = createMediaId("sticker");

      try {
        await saveStickerFile(mediaId, addFile);

        const newCard: CharacterCard = {
          id: createCardId(),
          character: addCharacter,
          type: "sticker",
          category: addCategory,
          text,
          mediaId,
          fileName: addFile.name,
          enabled: true,
        };

        updateCards([...cardPool, newCard]);
        resetAddForm();
      } catch (error) {
        console.error("保存贴纸失败:", error);
        alert("贴纸保存失败，请查看控制台。");
      }
    }
  }

  function resetAddForm() {
    setAddType("text");
    setAddCharacter("Levi");
    setAddCategory(categories[0] ?? "");
    setAddText("");
    setAddFile(null);
    setShowAddPanel(false);
  }

  /* -------------------------------------------------------
     删除
     ------------------------------------------------------- */

  async function deleteMediaForCard(card: CharacterCard) {
    if (!card.mediaId) return;

    try {
      if (card.type === "voice") {
        await deleteVoiceFile(card.mediaId);
      }
      if (card.type === "sticker") {
        await deleteStickerFile(card.mediaId);
      }
    } catch (error) {
      console.error("删除媒体文件失败:", error);
    }
  }

  async function deleteCard(card: CharacterCard) {
    const confirmed = window.confirm(
      "确定要删除这张 Card 吗？"
    );
    if (!confirmed) return;

    await deleteMediaForCard(card);

    const url = mediaUrls[card.id];
    if (url) URL.revokeObjectURL(url);

    const nextCards = cardPool.filter(
      (item) => item.id !== card.id
    );

    updateCards(nextCards);

    setSelectedIds((prev) =>
      prev.filter((id) => id !== card.id)
    );

    if (editingCard?.id === card.id) {
      closeEdit();
    }
  }

  function toggleCardEnabled(card: CharacterCard) {
    const nextCards = cardPool.map((item) =>
      item.id === card.id
        ? { ...item, enabled: !item.enabled }
        : item
    );
    updateCards(nextCards);
  }

  /* -------------------------------------------------------
     编辑
     ------------------------------------------------------- */

  function openEdit(card: CharacterCard) {
    setEditingCard(card);
    setEditCharacter(card.character);
    setEditCategory(card.category);
    setEditText(card.text);
    setEditEnabled(card.enabled);
  }

  function closeEdit() {
    setEditingCard(null);
    setEditText("");
  }

  function saveEdit() {
    if (!editingCard) return;

    const text = editText.trim();

    if (editingCard.type !== "sticker" && !text) {
      alert("这张 Card 需要文字内容。");
      return;
    }

    const nextCards = cardPool.map((card) =>
      card.id === editingCard.id
        ? {
            ...card,
            character: editCharacter,
            category: editCategory,
            text,
            enabled: editEnabled,
          }
        : card
    );

    updateCards(nextCards);
    closeEdit();
  }

  /* -------------------------------------------------------
     多选 / 批量
     ------------------------------------------------------- */

  function toggleSelected(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  }

  function toggleSelectAll() {
    const visibleIds = filteredCards.map(
      (card) => card.id
    );

    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) =>
        selectedIds.includes(id)
      );

    if (allSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !visibleIds.includes(id))
      );
    } else {
      setSelectedIds((prev) => [
        ...new Set([...prev, ...visibleIds]),
      ]);
    }
  }

  function batchSetEnabled(enabled: boolean) {
    const nextCards = cardPool.map((card) =>
      selectedIds.includes(card.id)
        ? { ...card, enabled }
        : card
    );
    updateCards(nextCards);
  }

  function batchSetCharacter(character: CardCharacter) {
    const nextCards = cardPool.map((card) =>
      selectedIds.includes(card.id)
        ? { ...card, character }
        : card
    );
    updateCards(nextCards);
  }

  function batchSetCategory(category: string) {
    const nextCards = cardPool.map((card) =>
      selectedIds.includes(card.id)
        ? { ...card, category }
        : card
    );
    updateCards(nextCards);
  }

  async function deleteSelected() {
    const selectedCards = cardPool.filter((card) =>
      selectedIds.includes(card.id)
    );

    const confirmed = window.confirm(
      `确定要删除 ${selectedCards.length} 张 Card 吗？`
    );
    if (!confirmed) return;

    for (const card of selectedCards) {
      await deleteMediaForCard(card);

      const url = mediaUrls[card.id];
      if (url) URL.revokeObjectURL(url);
    }

    const nextCards = cardPool.filter(
      (card) => !selectedIds.includes(card.id)
    );

    updateCards(nextCards);
    setSelectedIds([]);
  }

  /* -------------------------------------------------------
     筛选
     ------------------------------------------------------- */

  const filteredCards = useMemo(() => {
    return cardPool.filter((card) => {
      const characterMatch =
        characterFilter === "All" ||
        card.character === characterFilter;

      const typeMatch =
        typeFilter === "All" ||
        card.type === typeFilter;

      const categoryMatch =
        categoryFilter === "全部" ||
        card.category === categoryFilter;

      return (
        characterMatch && typeMatch && categoryMatch
      );
    });
  }, [
    cardPool,
    characterFilter,
    typeFilter,
    categoryFilter,
  ]);

  const allVisibleSelected =
    filteredCards.length > 0 &&
    filteredCards.every((card) =>
      selectedIds.includes(card.id)
    );

  const enabledCount = cardPool.filter(
    (card) => card.enabled
  ).length;

  /* -------------------------------------------------------
     ★ 播放语音（带诊断日志）
     ------------------------------------------------------- */

  function playVoice(card: CharacterCard) {
    const url = mediaUrls[card.id];

    if (!url) {
      alert(
        "找不到这条语音文件。\n" +
          "如果这是刚刚上传的，请刷新页面重试。\n" +
          "如果是旧卡片，可能需要删除后重新上传。"
      );
      return;
    }

    /* 点同一张卡：切换暂停/播放 */
    if (playingId === card.id && audioElement) {
      if (audioElement.paused) {
        void audioElement.play().catch((e) => {
          console.error("播放失败:", e);
          alert("播放失败：" + e.message);
        });
      } else {
        audioElement.pause();
      }
      return;
    }

    /* 其它情况：换一张卡播放 */
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }

    const audio = new Audio(url);

    audio.onplay = () => setPlayingId(card.id);
    audio.onpause = () => setPlayingId(null);
    audio.onended = () => setPlayingId(null);
    audio.onerror = (e) => {
      setPlayingId(null);
      const err = audio.error;
      console.error(
        "[CardStudio] 语音加载失败:",
        {
          code: err?.code,
          message: err?.message,
          url,
          cardId: card.id,
          mediaId: card.mediaId,
        }
      );
      alert(
        "语音无法播放。\n" +
          "可能原因：文件损坏或格式不被支持。\n" +
          "建议删除这张卡片后重新上传。"
      );
      void e;
    };

    setAudioElement(audio);

    audio
      .play()
      .then(() => {
        console.log(
          "[CardStudio] 开始播放:",
          card.id,
          url
        );
      })
      .catch((e) => {
        console.error("[CardStudio] play() 失败:", e);
        setPlayingId(null);
        alert(
          "播放失败：" +
            (e instanceof Error
              ? e.message
              : String(e))
        );
      });
  }

  function characterBadgeClass(c: CardCharacter) {
    if (c === "Levi")
      return "studio-character studio-levi";
    if (c === "Erwin")
      return "studio-character studio-erwin";
    return "studio-character studio-shared";
  }

  const textLineCount =
    addType === "text" ||
    addType === "pat" ||
    addType === "emoji"
      ? splitTextLines(addText).length
      : 0;

  return (
    <main className="studio-page card-studio-page">
      <header className="studio-header">
        <div>
          <div className="studio-eyebrow">RUNWITHME</div>
          <h1>Character Cards</h1>
          <p>管理他们所有可能出现的回复。</p>
        </div>

        <div className="studio-header-right">
          <div className="studio-count">
            {cardPool.length} cards
            <span
              style={{
                marginLeft: "8px",
                opacity: 0.55,
              }}
            >
              / {enabledCount} enabled
            </span>
          </div>

          <button
            className="studio-back-link"
            onClick={onBack}
          >
            ← Home
          </button>
        </div>
      </header>

      {/* 筛选 */}
      <section className="studio-toolbar">
        <div className="studio-filter-group">
          {(
            [
              "All",
              "Levi",
              "Erwin",
              "Shared",
            ] as FilterCharacter[]
          ).map((character) => (
            <button
              key={character}
              className={
                characterFilter === character
                  ? "studio-filter active"
                  : "studio-filter"
              }
              onClick={() =>
                setCharacterFilter(character)
              }
            >
              {character === "All"
                ? "All"
                : getCharacterLabel(character)}
            </button>
          ))}
        </div>

        <div className="studio-filter-group">
          {(
            [
              "All",
              "text",
              "voice",
              "sticker",
              "pat",
              "emoji",
            ] as FilterType[]
          ).map((type) => (
            <button
              key={type}
              className={
                typeFilter === type
                  ? "studio-filter active"
                  : "studio-filter"
              }
              onClick={() => setTypeFilter(type)}
            >
              {type === "All"
                ? "全部"
                : getTypeLabel(type)}
            </button>
          ))}
        </div>

        <select
          className="studio-select"
          value={categoryFilter}
          onChange={(event) =>
            setCategoryFilter(event.target.value)
          }
        >
          <option value="全部">全部分类</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <button
          className="studio-select-button"
          onClick={() => setShowCategoryEditor(true)}
        >
          ⚙ 分类
        </button>
      </section>

      {/* 操作 */}
      <section className="studio-actions">
        <button
          className="studio-add-button"
          onClick={() =>
            setShowAddPanel((prev) => !prev)
          }
        >
          ＋ 添加 Card
        </button>

        <button
          className="studio-select-button"
          onClick={toggleSelectAll}
        >
          {allVisibleSelected ? "取消全选" : "全选"}
        </button>
      </section>

      {/* 添加面板 */}
      {showAddPanel && (
        <section className="studio-add-panel">
          <div className="studio-panel-title">
            添加 Character Card
          </div>

          <div className="studio-form-row">
            <label>
              归属
              <select
                value={addCharacter}
                onChange={(event) =>
                  setAddCharacter(
                    event.target.value as CardCharacter
                  )
                }
                disabled={addType === "emoji"}
              >
                {CHARACTER_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {getCharacterLabel(c)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              类型
              <select
                value={addType}
                onChange={(event) => {
                  setAddType(
                    event.target.value as CardType
                  );
                  setAddFile(null);
                  setAddText("");
                }}
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              分类
              <select
                value={addCategory}
                onChange={(event) =>
                  setAddCategory(event.target.value)
                }
                disabled={categories.length === 0}
              >
                {categories.length === 0 ? (
                  <option value="">（无分类）</option>
                ) : (
                  categories.map((category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>

          {/* Text */}
          {addType === "text" && (
            <label className="studio-text-label">
              <div className="studio-text-label-row">
                <span>内容</span>

                {textLineCount > 0 && (
                  <span className="studio-text-count">
                    将添加 {textLineCount} 张卡片
                  </span>
                )}
              </div>

              <textarea
                className="studio-text-batch"
                value={addText}
                onChange={(event) =>
                  setAddText(event.target.value)
                }
                placeholder={
                  "每行一张卡片\n\n例如：\n今天辛苦了。\n早点休息。\n我在这里。"
                }
                rows={6}
              />
            </label>
          )}

          {/* Pat */}
          {addType === "pat" && (
            <label className="studio-text-label">
              <div className="studio-text-label-row">
                <span>
                  拍一拍内容（发送时会显示为「Levi 拍了拍你的头」）
                </span>

                {textLineCount > 0 && (
                  <span className="studio-text-count">
                    将添加 {textLineCount} 张
                  </span>
                )}
              </div>

              <textarea
                className="studio-text-batch"
                value={addText}
                onChange={(event) =>
                  setAddText(event.target.value)
                }
                placeholder={
                  "每行一条，例如：\n拍了拍你的头\n从背后抱住你\n揉了揉你的头发"
                }
                rows={6}
              />
            </label>
          )}

          {/* Emoji */}
          {addType === "emoji" && (
            <label className="studio-text-label">
              <div className="studio-text-label-row">
                <span>
                  Emoji（随机决定是否附加在文本前 / 后，或单独发出）
                </span>

                {textLineCount > 0 && (
                  <span className="studio-text-count">
                    将添加 {textLineCount} 个
                  </span>
                )}
              </div>

              <textarea
                className="studio-text-batch"
                value={addText}
                onChange={(event) =>
                  setAddText(event.target.value)
                }
                placeholder={
                  "每行一个 emoji，例如：\n💕\n🌸\n🥺\n☺️"
                }
                rows={6}
              />
            </label>
          )}

          {/* Voice */}
          {addType === "voice" && (
            <>
              <label>
                音频文件（mp3 / m4a / wav / aac / ogg）
                <input
                  type="file"
                  accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.opus"
                  onChange={handleAddFile}
                />
              </label>

              {addFile && (
                <div className="studio-file-name">
                  🎙️ {addFile.name} ·{" "}
                  {(addFile.size / 1024).toFixed(1)} KB
                  {addFile.type &&
                    ` · ${addFile.type}`}
                </div>
              )}

              <label>
                文字稿
                <textarea
                  value={addText}
                  onChange={(event) =>
                    setAddText(event.target.value)
                  }
                  placeholder="填写这条语音实际说的内容……"
                />
              </label>
            </>
          )}

          {/* Sticker */}
          {addType === "sticker" && (
            <>
              <label>
                贴纸图片
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAddFile}
                />
              </label>

              {addFile && (
                <div className="studio-file-name">
                  🧸 {addFile.name}
                </div>
              )}

              <label>
                贴纸文字
                <span className="studio-form-optional">
                  可选
                </span>
                <textarea
                  value={addText}
                  onChange={(event) =>
                    setAddText(event.target.value)
                  }
                  placeholder="如果这张贴纸需要附带文字，可以写在这里……"
                />
              </label>
            </>
          )}

          <div className="studio-add-footer">
            <button onClick={resetAddForm}>取消</button>

            <button
              onClick={() => void addCard()}
              disabled={
                (addType === "text" ||
                  addType === "pat" ||
                  addType === "emoji") &&
                textLineCount === 0
              }
            >
              保存 Card
            </button>
          </div>
        </section>
      )}

      {/* 批量 */}
      {selectedIds.length > 0 && (
        <section className="studio-batch-bar">
          <span>已选择 {selectedIds.length} 张</span>

          <button onClick={() => batchSetEnabled(true)}>
            启用
          </button>

          <button onClick={() => batchSetEnabled(false)}>
            停用
          </button>

          <select
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) {
                batchSetCharacter(
                  event.target.value as CardCharacter
                );
                event.target.value = "";
              }
            }}
          >
            <option value="" disabled>
              改归属
            </option>
            {CHARACTER_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {getCharacterLabel(c)}
              </option>
            ))}
          </select>

          <select
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) {
                batchSetCategory(event.target.value);
                event.target.value = "";
              }
            }}
          >
            <option value="" disabled>
              改分类
            </option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <button
            className="danger"
            onClick={() => void deleteSelected()}
          >
            删除
          </button>
        </section>
      )}

      {/* 列表 */}
      <section className="studio-card-list">
        {filteredCards.length === 0 ? (
          <div className="studio-empty">
            <div>♡</div>
            <p>这里还没有 Card。</p>
          </div>
        ) : (
          filteredCards.map((card) => {
            const selected = selectedIds.includes(
              card.id
            );

            return (
              <article
                key={card.id}
                className={
                  selected
                    ? "studio-card selected"
                    : "studio-card"
                }
              >
                <label className="studio-checkbox">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() =>
                      toggleSelected(card.id)
                    }
                  />
                  <span />
                </label>

                <div className="studio-card-main">
                  <div className="studio-card-meta">
                    <span
                      className={characterBadgeClass(
                        card.character
                      )}
                    >
                      {getCharacterLabel(card.character)}
                    </span>

                    <span className="studio-category">
                      {card.category}
                    </span>

                    <span className="studio-type-label">
                      {getTypeLabel(card.type)}
                    </span>

                    {!card.enabled && (
                      <span className="studio-disabled">
                        已停用
                      </span>
                    )}
                  </div>

                  {card.type === "text" && (
                    <div className="studio-card-text">
                      {card.text}
                    </div>
                  )}

                  {card.type === "pat" && (
                    <div className="studio-card-text studio-card-pat">
                      👋 {card.text}
                    </div>
                  )}

                  {card.type === "emoji" && (
                    <div className="studio-card-text studio-card-emoji">
                      {card.text}
                    </div>
                  )}

                  {card.type === "voice" && (
                    <div className="studio-voice-row">
                      <button
                        type="button"
                        className="studio-voice-play"
                        onClick={() => playVoice(card)}
                      >
                        {playingId === card.id
                          ? "Ⅱ"
                          : "▶"}
                      </button>

                      <div>
                        <div className="studio-file-name">
                          🎙️ {card.fileName}
                        </div>

                        <div className="studio-card-text">
                          「{card.text}」
                        </div>
                      </div>
                    </div>
                  )}

                  {card.type === "sticker" && (
                    <div className="studio-sticker-row">
                      <div className="studio-sticker-thumb">
                        {mediaUrls[card.id] ? (
                          <img
                            src={mediaUrls[card.id]}
                            alt={
                              card.fileName ?? "Sticker"
                            }
                          />
                        ) : (
                          <span>🧸</span>
                        )}
                      </div>

                      <div>
                        <div className="studio-file-name">
                          🧸 {card.fileName}
                        </div>

                        {card.text && (
                          <div className="studio-card-text">
                            「{card.text}」
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="studio-card-id">
                    {card.id}
                  </div>
                </div>

                <div className="studio-card-actions">
                  <button
                    className={
                      card.enabled
                        ? "card-toggle active"
                        : "card-toggle"
                    }
                    onClick={() =>
                      toggleCardEnabled(card)
                    }
                  >
                    {card.enabled ? "启用" : "停用"}
                  </button>

                  <button
                    className="card-edit"
                    onClick={() => openEdit(card)}
                  >
                    编辑
                  </button>

                  <button
                    className="card-delete"
                    onClick={() => void deleteCard(card)}
                  >
                    删除
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>

      {/* 编辑 */}
      {editingCard && (
        <div
          className="studio-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeEdit();
            }
          }}
        >
          <section
            className="studio-edit-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="studio-modal-header">
              <div>
                <div className="studio-eyebrow">
                  CARD EDITOR
                </div>
                <h2>编辑 Card</h2>
              </div>

              <button
                className="studio-modal-close"
                onClick={closeEdit}
              >
                ×
              </button>
            </div>

            <div className="studio-edit-form">
              <div className="studio-modal-type">
                {getTypeLabel(editingCard.type)}
                <span>类型不可修改</span>
              </div>

              <label>
                归属
                <select
                  value={editCharacter}
                  onChange={(event) =>
                    setEditCharacter(
                      event.target.value as CardCharacter
                    )
                  }
                >
                  {CHARACTER_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {getCharacterLabel(c)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                分类
                <select
                  value={editCategory}
                  onChange={(event) =>
                    setEditCategory(event.target.value)
                  }
                >
                  {categories.length === 0 ? (
                    <option value="">（无分类）</option>
                  ) : (
                    categories.map((category) => (
                      <option
                        key={category}
                        value={category}
                      >
                        {category}
                      </option>
                    ))
                  )}

                  {editCategory &&
                    !categories.includes(editCategory) && (
                      <option value={editCategory}>
                        {editCategory}（已删除）
                      </option>
                    )}
                </select>
              </label>

              <label>
                {editingCard.type === "voice"
                  ? "文字稿"
                  : editingCard.type === "sticker"
                    ? "贴纸文字"
                    : editingCard.type === "pat"
                      ? "拍一拍内容"
                      : editingCard.type === "emoji"
                        ? "Emoji"
                        : "内容"}

                {editingCard.type === "sticker" && (
                  <span className="studio-form-optional">
                    可选
                  </span>
                )}

                <textarea
                  value={editText}
                  onChange={(event) =>
                    setEditText(event.target.value)
                  }
                  autoFocus
                />
              </label>

              {editingCard.type === "voice" && (
                <div className="studio-modal-file studio-modal-file-voice">
                  🎙️ {editingCard.fileName}
                  <div className="studio-modal-file-hint">
                    音频文件暂时不能在编辑窗口中更换
                  </div>
                </div>
              )}

              {editingCard.type === "sticker" && (
                <div className="studio-modal-file studio-modal-file-sticker">
                  🧸 {editingCard.fileName}
                  <div className="studio-modal-file-hint">
                    图片文件暂时不能在编辑窗口中更换
                  </div>
                </div>
              )}

              <label className="studio-enabled-row">
                <span>Card 状态</span>

                <button
                  type="button"
                  className={
                    editEnabled
                      ? "studio-switch on"
                      : "studio-switch"
                  }
                  onClick={() =>
                    setEditEnabled(
                      (previous) => !previous
                    )
                  }
                >
                  <span />
                </button>

                <small>
                  {editEnabled ? "启用" : "停用"}
                </small>
              </label>
            </div>

            <div className="studio-modal-footer">
              <button
                className="studio-cancel"
                onClick={closeEdit}
              >
                取消
              </button>

              <button
                className="studio-save"
                onClick={saveEdit}
                disabled={
                  editingCard.type !== "sticker" &&
                  !editText.trim()
                }
              >
                保存修改
              </button>
            </div>
          </section>
        </div>
      )}

      {showCategoryEditor && (
        <CategoryEditor
          categories={categories}
          onClose={() => setShowCategoryEditor(false)}
          onChange={updateCategories}
        />
      )}
    </main>
  );
}