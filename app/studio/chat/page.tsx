"use client";

import { useRouter } from "next/navigation";

import CardStudioApp from "@/components/apps/CardStudioApp";

/**
 * 保留旧路由 /studio/chat
 *
 * 现在 Card Studio 已经是独立 App，
 * 这个文件只是一个薄包装，
 * 让旧链接和 /studio 入口仍然可用。
 *
 * 返回时统一回到 /studio。
 */
export default function StudioChatPage() {
  const router = useRouter();

  return (
    <CardStudioApp
      onBack={() => router.push("/studio")}
    />
  );
}