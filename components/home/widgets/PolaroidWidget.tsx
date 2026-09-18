"use client";

import { useEffect, useState } from "react";

import { getHomeFile } from "@/lib/homeFiles";

type Props = {
  imageId: string;
  caption?: string;
  dateLabel?: string;
};

export default function PolaroidWidget({ imageId }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;

    async function load() {
      try {
        const blob = await getHomeFile(imageId);
        if (!blob) return;

        const u = URL.createObjectURL(blob);
        created = u;

        if (cancelled) {
          URL.revokeObjectURL(u);
          return;
        }

        setUrl(u);
      } catch (e) {
        console.error("加载拍立得图片失败:", e);
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [imageId]);

  return (
    <div className="polaroid-widget">
      {url ? (
        <img src={url} alt="" draggable={false} />
      ) : (
        <div className="polaroid-widget-loading">…</div>
      )}
    </div>
  );
}