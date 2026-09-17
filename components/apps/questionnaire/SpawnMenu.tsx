"use client";

type Props = {
  onClose: () => void;
  onSpawnText: () => void;
  onSpawnChoice: () => void;
};

export default function SpawnMenu({
  onClose,
  onSpawnText,
  onSpawnChoice,
}: Props) {
  return (
    <div
      className="q-spawn-backdrop"
      onClick={onClose}
    >
      <div
        className="q-spawn-menu"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="q-spawn-label">
          让他们问点什么
        </div>

        <button
          className="q-spawn-item"
          onClick={() => {
            onSpawnText();
            onClose();
          }}
          type="button"
        >
          <span className="q-spawn-icon">❔</span>
          <span className="q-spawn-info">
            <strong>文字问题</strong>
            <span>经典的一问一答</span>
          </span>
        </button>

        <button
          className="q-spawn-item"
          onClick={() => {
            onSpawnChoice();
            onClose();
          }}
          type="button"
        >
          <span className="q-spawn-icon">☰</span>
          <span className="q-spawn-info">
            <strong>选项问卷</strong>
            <span>从卡池抽 2~4 个选项</span>
          </span>
        </button>
      </div>
    </div>
  );
}