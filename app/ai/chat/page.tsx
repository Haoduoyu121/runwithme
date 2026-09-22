"use client";

import { useEffect, useState } from "react";
import ChatView from "@/components/ai/ChatView";

export default function AiChatQueryPage() {
  const [cardId, setCardId] = useState<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setCardId(p.get("id") || "__demo__");
  }, []);

  if (!cardId) {
    return (
      <div className="ai-home">
        <div className="ai-empty">加载中…</div>
      </div>
    );
  }

  return <ChatView cardId={cardId} />;
}