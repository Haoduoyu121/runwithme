"use client";

import { useEffect, useState } from "react";

import {
  ChevronLeft,
  ImagePlus,
  Trash2,
} from "lucide-react";

import { useSystem } from "@/lib/SystemContext";

import {
  saveChatFile,
  getChatFile,
  deleteChatFile,
} from "@/lib/chatFiles";

type Props = { onBack: () => void };

type TabKey = "levi" | "erwin" | "general";

export default function PotatoApp({ onBack }: Props) {
  const { settings, updateSettings, theme } = useSystem();

  const [tab, setTab] = useState<TabKey>("levi");

  const [avatarPreviews, setAvatarPreviews] = useState<{
    levi: string | null;
    erwin: string | null;
  }>({ levi: null, erwin: null });

  const [nameLeviDraft, setNameLeviDraft] = useState(
    settings.characterNames.levi
  );
  const [nameErwinDraft, setNameErwinDraft] = useState(
    settings.characterNames.erwin
  );

  /* 同步设置变化 */
  useEffect(() => {
    setNameLeviDraft(settings.characterNames.levi);
    setNameErwinDraft(settings.characterNames.erwin);
  }, [settings.characterNames]);

  /* 加载角色头像预览 */
  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];

    async function load() {
      const next: {
        levi: string | null;
        erwin: string | null;
      } = { levi: null, erwin: null };

      for (const key of ["levi", "erwin"] as const) {
        if (!settings.avatars[key]) continue;
        const file = await getChatFile(`avatar-${key}`);
        if (!file) continue;
        const url = URL.createObjectURL(file);
        created.push(url);
        next[key] = url;
      }
      if (!cancelled) setAvatarPreviews(next);
    }

    void load();
    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [settings.avatars]);

  async function uploadAvatar(
    key: "levi" | "erwin",
    file: File
  ) {
    await saveChatFile(`avatar-${key}`, file);
    const url = URL.createObjectURL(file);
    setAvatarPreviews((prev) => ({ ...prev, [key]: url }));
    updateSettings({
      avatars: {
        ...settings.avatars,
        [key]: "custom",
      },
    });
  }

  async function removeAvatar(key: "levi" | "erwin") {
    await deleteChatFile(`avatar-${key}`);
    setAvatarPreviews((prev) => ({ ...prev, [key]: null }));
    updateSettings({
      avatars: {
        ...settings.avatars,
        [key]: null,
      },
    });
  }

  function saveName(key: "levi" | "erwin") {
    const draft =
      key === "levi" ? nameLeviDraft : nameErwinDraft;
    const trimmed = draft.trim();
    if (!trimmed) return;
    updateSettings({
      characterNames: {
        ...settings.characterNames,
        [key]: trimmed,
      },
    });
  }

  /* 单聊回复时限 */
  const cfg = settings.chatReply;
  const singleMin = cfg.singleAutoReplyMin ?? 5;
  const singleMax = cfg.singleAutoReplyMax ?? 30;

  function setSingleMin(v: number) {
    const safe = Math.max(1, Math.min(720, v));
    updateSettings({
      chatReply: {
        ...settings.chatReply,
        singleAutoReplyMin: safe,
      },
    });
  }

  function setSingleMax(v: number) {
    const safe = Math.max(1, Math.min(720, v));
    updateSettings({
      chatReply: {
        ...settings.chatReply,
        singleAutoReplyMax: safe,
      },
    });
  }

  const themeClass =
    theme === "dark" ? " chat-dark" : " chat-light";

  return (
    <main
      className={`phone-screen potato-app${themeClass}`}
    >
      <div className="potato-topbar">
  <button
    type="button"
    className="potato-topbar-back"
    onPointerDown={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onBack();
    }}
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
    }}
    aria-label="返回"
  >
    <ChevronLeft size={26} strokeWidth={2.4} />
  </button>

  <div className="potato-topbar-title">
    生姜土豆
  </div>

  <div className="potato-topbar-spacer" />
</div>

     <div className="potato-tabs">
  <button
    type="button"
    className={tab === "levi" ? "active" : ""}
    onPointerDown={(e) => {
      e.preventDefault();
      setTab("levi");
    }}
  >
    {settings.characterNames.levi}
  </button>
  <button
    type="button"
    className={tab === "erwin" ? "active" : ""}
    onPointerDown={(e) => {
      e.preventDefault();
      setTab("erwin");
    }}
  >
    {settings.characterNames.erwin}
  </button>
  <button
    type="button"
    className={tab === "general" ? "active" : ""}
    onPointerDown={(e) => {
      e.preventDefault();
      setTab("general");
    }}
  >
    通用
  </button>
</div>

      <div className="potato-scroll">
        {tab === "levi" && (
          <CharacterPanel
            avatarUrl={avatarPreviews.levi}
            avatarClass="avatar-levi"
            fallback={settings.characterNames.levi
              .charAt(0)
              .toUpperCase()}
            displayName={settings.characterNames.levi}
            nameDraft={nameLeviDraft}
            onNameChange={setNameLeviDraft}
            onNameSave={() => saveName("levi")}
            onUpload={(file) =>
              void uploadAvatar("levi", file)
            }
            onRemove={() => void removeAvatar("levi")}
          />
        )}

        {tab === "erwin" && (
          <CharacterPanel
            avatarUrl={avatarPreviews.erwin}
            avatarClass="avatar-erwin"
            fallback={settings.characterNames.erwin
              .charAt(0)
              .toUpperCase()}
            displayName={settings.characterNames.erwin}
            nameDraft={nameErwinDraft}
            onNameChange={setNameErwinDraft}
            onNameSave={() => saveName("erwin")}
            onUpload={(file) =>
              void uploadAvatar("erwin", file)
            }
            onRemove={() => void removeAvatar("erwin")}
          />
        )}

        {tab === "general" && (
          <div className="potato-general">
            <div className="potato-section-title">
              单聊回复间隔
            </div>
            <div className="potato-hint">
            角色在单聊里后台主动发消息的间隔，群聊不受影响。
            </div>

            <div className="potato-reply-row">
              <span className="potato-reply-label">
                最短
              </span>
              <label className="potato-num">
                <input
                  type="number"
                  value={singleMin}
                  min={1}
                  max={720}
                  onChange={(e) =>
                    setSingleMin(
                      Number(e.target.value) || 1
                    )
                  }
                />
                <span className="potato-num-suffix">
                  分
                </span>
              </label>
            </div>

            <div className="potato-reply-row">
              <span className="potato-reply-label">
                最长
              </span>
              <label className="potato-num">
                <input
                  type="number"
                  value={singleMax}
                  min={1}
                  max={720}
                  onChange={(e) =>
                    setSingleMax(
                      Number(e.target.value) || 1
                    )
                  }
                />
                <span className="potato-num-suffix">
                  分
                </span>
              </label>
            </div>

            <div className="potato-hint">
              例：最短 5、最长 30，表示每次随机在
              5~30 分钟之间抽一个时间发消息。
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/* =========================================================
   角色面板
   ========================================================= */

function CharacterPanel({
  avatarUrl,
  avatarClass,
  fallback,
  displayName,
  nameDraft,
  onNameChange,
  onNameSave,
  onUpload,
  onRemove,
}: {
  avatarUrl: string | null;
  avatarClass: string;
  fallback: string;
  displayName: string;
  nameDraft: string;
  onNameChange: (v: string) => void;
  onNameSave: () => void;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="potato-character">
      <div className="potato-avatar-wrap">
        <div
          className={`potato-avatar ${avatarClass}${
            avatarUrl ? " has-image" : ""
          }`}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} />
          ) : (
            fallback
          )}
        </div>

        <div className="potato-avatar-actions">
          <label className="potato-avatar-btn">
            <ImagePlus size={16} strokeWidth={2.2} />
            <span>更换头像</span>
            <input
              type="file"
              accept="image/*"
              className="ios-file-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
                e.target.value = "";
              }}
            />
          </label>

          {avatarUrl && (
            <button
              type="button"
              className="potato-avatar-btn is-danger"
              onClick={onRemove}
            >
              <Trash2 size={16} strokeWidth={2.2} />
              <span>移除</span>
            </button>
          )}
        </div>
      </div>

      <div className="potato-field">
        <div className="potato-field-label">
          显示名字
        </div>
        <input
          type="text"
          className="potato-field-input"
          value={nameDraft}
          onChange={(e) => onNameChange(e.target.value)}
          onBlur={onNameSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onNameSave();
              (e.target as HTMLInputElement).blur();
            }
          }}
          maxLength={12}
          placeholder={displayName}
        />
        <div className="potato-hint">
          只改显示名，卡池归属仍然是 Levi / Erwin。
        </div>
      </div>
    </div>
  );
}