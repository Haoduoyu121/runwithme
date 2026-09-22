"use client";

import { useParams } from "next/navigation";
import ChatView from "@/components/ai/ChatView";

export default function AiChatPageClient() {
  const params = useParams<{ cardId: string }>();
  const cardId = params?.cardId || "";
  return <ChatView cardId={cardId} />;
}