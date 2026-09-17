"use client";

import { useState } from "react";

export type PhotoNamingItem = {
  id: string;
  fileName: string;
  url: string;
};

type Props = {
  items: PhotoNamingItem[];
  onConfirm: (names: Record<string, string>) => void;
  onSkip: () => void;
};

/* 从文件名提取一个还算好看的默认名 */
export function displayPhotoName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "");
  /* 相机 / 手机自动命名的规则：IMG_1234 / DSC_5678 / PXL_... */
  if (/^(IMG|DSC|DCIM|PHOTO|PXL)[_-]?\d+$/i.test(base)) {
    return "未命名照片";
  }
  return base.trim() || "未命名照片";
}

export default function PhotoNamingModal({
  items,
  onConfirm,
  onSkip,
}: Props) {
  const [names, setNames] = useState<Record<string, string>>(
    () => {
      const init: Record<string, string> = {};
      items.forEach((it) => {
        init[it.id] = "";
      });
      return init;
    }
  );

  function handleChange(id: string, value: string) {
    setNames((prev) => ({ ...prev, [id]: value }));
  }

  return (
    <div
      className="photo-naming-backdrop"
      onClick={onSkip}
    >
      <div
        className="photo-naming-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="photo-naming-header">
          <h2>给照片取个名字</h2>
          <span className="photo-naming-count">
            {items.length} 张
          </span>
        </div>

        <div className="photo-naming-hint">
          留空则使用默认名称。以后也可以在照片详情里改。
        </div>

        <div className="photo-naming-list">
          {items.map((it) => (
            <div key={it.id} className="photo-naming-row">
              <div className="photo-naming-thumb">
                {it.url ? (
                  <img src={it.url} alt="" />
                ) : (
                  <span>…</span>
                )}
              </div>

              <input
                type="text"
                className="photo-naming-input"
                value={names[it.id] ?? ""}
                onChange={(e) =>
                  handleChange(it.id, e.target.value)
                }
                placeholder={displayPhotoName(it.fileName)}
                maxLength={40}
                autoFocus={items.length === 1}
              />
            </div>
          ))}
        </div>

        <div className="photo-naming-footer">
          <button
            className="photo-naming-skip"
            onClick={onSkip}
          >
            跳过
          </button>
          <button
            className="photo-naming-confirm"
            onClick={() => onConfirm(names)}
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}