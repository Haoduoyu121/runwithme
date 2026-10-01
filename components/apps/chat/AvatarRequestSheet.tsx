"use client";

import { useEffect, useState } from "react";

import {
  ImagePlus,
  Images,
  X,
} from "lucide-react";

import type { AvatarLibraryOwner } from "@/data/avatarLibrary";
import { loadAvatarLibraryByOwner } from "@/lib/avatarLibraryStorage";
import { getAvatarLibraryFile } from "@/lib/avatarLibraryFiles";
import { compressImage } from "@/lib/imageCompress";

export type AvatarRequestTarget =
  | AvatarLibraryOwner
  | "Both";

type Props = {
  /** 单聊锁定角色；群聊 = null，会先让用户选 */
  lockedOwner: AvatarLibraryOwner | null;
  onClose: () => void;
  onConfirm: (
    requests: { owner: AvatarLibraryOwner; blob: Blob }[]
  ) => void;
};

type Step = "pickOwner" | "pickSource";

export default function AvatarRequestSheet({
  lockedOwner,
  onClose,
  onConfirm,
}: Props) {
  const [step, setStep] = useState<Step>(
    lockedOwner ? "pickSource" : "pickOwner"
  );
  const [target, setTarget] =
    useState<AvatarRequestTarget | null>(lockedOwner);

  /* 头像库预览 */
  const [libItems, setLibItems] = useState<
    { id: string; url: string }[]
  >([]);
  const [showLibrary, setShowLibrary] = useState(false);

  /* 加载头像库预览（按 target 查） */
  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];

    async function load() {
      if (!target) {
        setLibItems([]);
        return;
      }
      const owners: AvatarLibraryOwner[] =
        target === "Both"
          ? ["Levi", "Erwin"]
          : [target];

      const next: { id: string; url: string }[] = [];
      for (const o of owners) {
        const items = loadAvatarLibraryByOwner(o, "chat");
        for (const it of items) {
          if (!it.enabled) continue;
          try {
            const blob = await getAvatarLibraryFile(it.id);
            if (!blob || cancelled) continue;
            const url = URL.createObjectURL(blob);
            created.push(url);
            next.push({ id: it.id, url });
          } catch {}
        }
      }
      if (!cancelled) setLibItems(next);
    }

    void load();
    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [target]);

  function handlePickOwner(o: AvatarRequestTarget) {
    setTarget(o);
    setStep("pickSource");
  }

  async function handleUpload(files: File[]) {
    if (!target || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) return;

    const blob = await compressImage(file, 800, 0.85);

    finish([
      {
        owner:
          target === "Both"
            ? "Levi"
            : (target as AvatarLibraryOwner),
        blob,
      },
      ...(target === "Both"
        ? [
            {
              owner: "Erwin" as AvatarLibraryOwner,
              blob,
            },
          ]
        : []),
    ]);
  }

  async function handlePickFromLibrary(id: string) {
    if (!target) return;
    const blob = await getAvatarLibraryFile(id);
    if (!blob) return;

    finish([
      {
        owner:
          target === "Both"
            ? "Levi"
            : (target as AvatarLibraryOwner),
        blob,
      },
      ...(target === "Both"
        ? [
            {
              owner: "Erwin" as AvatarLibraryOwner,
              blob,
            },
          ]
        : []),
    ]);
  }

  function finish(
    requests: { owner: AvatarLibraryOwner; blob: Blob }[]
  ) {
    onConfirm(requests);
    onClose();
  }

  return (
    <div
      className="avatar-req-backdrop"
      onClick={onClose}
    >
      <div
        className="avatar-req-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="avatar-req-header">
          <span>
            {step === "pickOwner"
              ? "让谁换头像"
              : "选择新头像"}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={20} strokeWidth={2.2} />
          </button>
        </header>

        {step === "pickOwner" && (
          <div className="avatar-req-owners">
            <button
              type="button"
              onClick={() => handlePickOwner("Levi")}
            >
              Levi
            </button>
            <button
              type="button"
              onClick={() => handlePickOwner("Erwin")}
            >
              Erwin
            </button>
            <button
              type="button"
              onClick={() => handlePickOwner("Both")}
            >
              两个都换
            </button>
          </div>
        )}

        {step === "pickSource" && (
          <>
            {!showLibrary ? (
              <div className="avatar-req-sources">
                <label className="avatar-req-source-btn">
                  <ImagePlus size={22} strokeWidth={2} />
                  <span>相册上传</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="ios-file-input"
                    onChange={(e) => {
                      const files = Array.from(
                        e.target.files ?? []
                      );
                      if (files.length > 0) {
                        void handleUpload(files);
                      }
                      e.target.value = "";
                    }}
                  />
                </label>

                <button
                  type="button"
                  className="avatar-req-source-btn"
                  onClick={() => setShowLibrary(true)}
                >
                  <Images size={22} strokeWidth={2} />
                  <span>从头像库选</span>
                </button>
              </div>
            ) : (
              <div className="avatar-req-lib">
                {libItems.length === 0 ? (
                  <div className="avatar-req-lib-empty">
                    头像库还没有图
                  </div>
                ) : (
                  <div className="avatar-req-lib-grid">
                    {libItems.map((it) => (
                      <button
                        key={it.id}
                        type="button"
                        className="avatar-req-lib-item"
                        onClick={() =>
                          void handlePickFromLibrary(it.id)
                        }
                      >
                        <img src={it.url} alt="" />
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className="avatar-req-lib-back"
                  onClick={() => setShowLibrary(false)}
                >
                  返回
                </button>
              </div>
            )}

            {target !== null && (
              <div className="avatar-req-hint">
                目标：
                {target === "Both"
                  ? "Levi & Erwin"
                  : target}
                {" · "}他们会在稍后考虑是否接受
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}