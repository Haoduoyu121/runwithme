"use client";

import type { ListenPartner } from "@/lib/listenTogetherStorage";

type Props = {
  partner: ListenPartner;
  avatarUrls: Record<
    "you" | "levi" | "erwin",
    string | null
  >;
  elapsedMs: number;
  showTimer: boolean;
  size?: number;
  onClick: () => void;
};

function avatarFallback(
  key: "you" | "levi" | "erwin"
): string {
  if (key === "you") return "Y";
  if (key === "levi") return "L";
  return "E";
}

export default function TogetherAvatars({
  partner,
  avatarUrls,
  elapsedMs,
  showTimer,
  size = 44,
  onClick,
}: Props) {
  /* 构造显示顺序 */
  const order: ("you" | "levi" | "erwin")[] = [];

  if (partner === "Solo") {
    order.push("you");
  } else if (partner === "Levi") {
    order.push("levi", "you");
  } else if (partner === "Erwin") {
    order.push("erwin", "you");
  } else if (partner === "Both") {
    order.push("levi", "you", "erwin");
  }

  const overlap = size * 0.3;
  const totalWidth =
    order.length * size - (order.length - 1) * overlap;

  const elapsedSec = Math.floor(elapsedMs / 1000);
  const h = Math.floor(elapsedSec / 3600);
  const m = Math.floor((elapsedSec % 3600) / 60);
  const s = elapsedSec % 60;
  const timerText = `${String(h).padStart(2, "0")}:${String(
    m
  ).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  const isTogether = partner !== "Solo";

  return (
    <div className="together-avatars-wrap">
      <button
        type="button"
        className="together-avatars-btn"
        onClick={onClick}
        style={{
          width: totalWidth,
          height: size,
        }}
        aria-label={isTogether ? "一起听聊天" : "邀请一起听"}
      >
        {order.map((k, i) => {
          const url = avatarUrls[k];
          return (
            <span
              key={k}
              className={`together-avatar together-avatar-${k}${
                url ? " has-image" : ""
              }`}
              style={{
                width: size,
                height: size,
                left: i * (size - overlap),
                zIndex: i + 1,
                fontSize: size * 0.4,
              }}
            >
              {url ? (
                <img src={url} alt={k} />
              ) : (
                avatarFallback(k)
              )}
            </span>
          );
        })}
      </button>

      {isTogether && showTimer && (
        <div className="together-timer">
          一起听了 {timerText}
        </div>
      )}
    </div>
  );
}