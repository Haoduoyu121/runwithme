"use client";

import type { PhotoCategory } from "@/lib/photoStorage";

type CategoryPickerProps = {
  categories: PhotoCategory[];
  count: number;
  onClose: () => void;
  onPick: (categoryId: string | null) => void;
};

export default function CategoryPicker({
  categories,
  count,
  onClose,
  onPick,
}: CategoryPickerProps) {
  return (
    <div
      className="photo-picker-backdrop"
      onClick={onClose}
    >
      <div
        className="photo-picker-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="photo-picker-header">
          <h2>将 {count} 张照片移动到</h2>

          <button onClick={onClose}>×</button>
        </div>

        <div className="photo-picker-list">
          <button
            className="photo-picker-item"
            onClick={() => onPick(null)}
          >
            未分类
          </button>

          {categories.map((c) => (
            <button
              key={c.id}
              className="photo-picker-item"
              onClick={() => onPick(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}