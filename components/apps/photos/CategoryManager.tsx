"use client";

import { useState } from "react";

import type { PhotoCategory } from "@/lib/photoStorage";

type CategoryManagerProps = {
  categories: PhotoCategory[];
  onClose: () => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
};

export default function CategoryManager({
  categories,
  onClose,
  onCreate,
  onRename,
  onDelete,
}: CategoryManagerProps) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<
    string | null
  >(null);
  const [editName, setEditName] = useState("");

  function handleCreate() {
    const v = newName.trim();
    if (!v) return;

    onCreate(v);
    setNewName("");
  }

  function startEdit(c: PhotoCategory) {
    setEditingId(c.id);
    setEditName(c.name);
  }

  function saveEdit() {
    if (!editingId) return;

    const v = editName.trim();
    if (!v) return;

    onRename(editingId, v);
    setEditingId(null);
  }

  return (
    <div
      className="photo-cat-backdrop"
      onClick={onClose}
    >
      <div
        className="photo-cat-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="photo-cat-header">
          <h2>分类管理</h2>

          <button onClick={onClose}>×</button>
        </div>

        <div className="photo-cat-create">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              }
            }}
            placeholder="新分类名称…"
            maxLength={20}
          />

          <button onClick={handleCreate}>添加</button>
        </div>

        <div className="photo-cat-list">
          {categories.length === 0 ? (
            <div className="photo-cat-empty">
              还没有自定义分类
            </div>
          ) : (
            categories.map((c) => (
              <div key={c.id} className="photo-cat-item">
                {editingId === c.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) =>
                        setEditName(e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          saveEdit();
                        }
                      }}
                      maxLength={20}
                      autoFocus
                    />

                    <button onClick={saveEdit}>✓</button>

                    <button
                      onClick={() => setEditingId(null)}
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <>
                    <span className="photo-cat-name">
                      {c.name}
                    </span>

                    <button
                      className="photo-cat-action"
                      onClick={() => startEdit(c)}
                    >
                      重命名
                    </button>

                    <button
                      className="photo-cat-action danger"
                      onClick={() => onDelete(c.id)}
                    >
                      删除
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}