"use client";

import { useParams } from "next/navigation";
import ChatView from "@/components/ai/ChatView";

export function generateStaticParams() {
  return [{ cardId: '__demo__' }];
}

export default function AiChatPage() {
  const params = useParams<{ cardId: string }>();
  const cardId = params?.cardId || "";
  return <ChatView cardId={cardId} />;
}