"use client";

import { useState } from "react";

type CategoryEditorProps = {
  categories: string[];
  onClose: () => void;
  onChange: (next: string[]) => void;
};

export default function CategoryEditor({
  categories,
  onClose,
  onChange,
}: CategoryEditorProps) {
  const [newName, setNewName] = useState("");
  const [editingIndex, setEditingIndex] = useState<
    number | null
  >(null);
  const [editValue, setEditValue] = useState("");

  function handleAdd() {
    const v = newName.trim();
    if (!v) return;

    if (categories.includes(v)) {
      alert("这个分类已存在。");
      return;
    }

    onChange([...categories, v]);
    setNewName("");
  }

  function handleDelete(index: number) {
    const name = categories[index];

    const confirmed = window.confirm(
      `删除分类「${name}」？\n\n该分类下的卡片不会被删除，分类名会保留在卡片上。`
    );
    if (!confirmed) return;

    onChange(categories.filter((_, i) => i !== index));
  }

  function startEdit(index: number) {
    setEditingIndex(index);
    setEditValue(categories[index]);
  }

  function saveEdit() {
    if (editingIndex === null) return;

    const v = editValue.trim();
    if (!v) return;

    if (
      categories.includes(v) &&
      categories[editingIndex] !== v
    ) {
      alert("这个分类已存在。");
      return;
    }

    const next = [...categories];
    next[editingIndex] = v;
    onChange(next);

    setEditingIndex(null);
    setEditValue("");
  }

  function cancelEdit() {
    setEditingIndex(null);
    setEditValue("");
  }

  return (
    <div
      className="studio-cat-backdrop"
      onClick={onClose}
    >
      <div
        className="studio-cat-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="studio-cat-header">
          <h2>分类管理</h2>

          <button onClick={onClose}>×</button>
        </div>

        <div className="studio-cat-create">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="新分类名称…"
            maxLength={20}
          />

          <button onClick={handleAdd}>添加</button>
        </div>

        <div className="studio-cat-list">
          {categories.length === 0 ? (
            <div className="studio-cat-empty">
              还没有分类
            </div>
          ) : (
            categories.map((c, i) => (
              <div
                key={`${c}-${i}`}
                className="studio-cat-item"
              >
                {editingIndex === i ? (
                  <>
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) =>
                        setEditValue(e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          saveEdit();
                        }
                        if (e.key === "Escape") {
                          cancelEdit();
                        }
                      }}
                      maxLength={20}
                      autoFocus
                    />

                    <button onClick={saveEdit}>✓</button>

                    <button onClick={cancelEdit}>×</button>
                  </>
                ) : (
                  <>
                    <span className="studio-cat-name">
                      {c}
                    </span>

                    <button
                      className="studio-cat-action"
                      onClick={() => startEdit(i)}
                    >
                      重命名
                    </button>

                    <button
                      className="studio-cat-action danger"
                      onClick={() => handleDelete(i)}
                    >
                      删除
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="studio-cat-footer">
          卡片上的分类名不会因为删除分类而改变。
        </div>
      </div>
    </div>
  );
}