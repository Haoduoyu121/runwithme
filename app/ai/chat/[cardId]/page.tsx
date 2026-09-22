import AiChatPageClient from "@/components/ai/AiChatPageClient";

export function generateStaticParams() {
  return [{ cardId: "__demo__" }];
}

export default function AiChatPage() {
  return <AiChatPageClient />;
}