"use client";

import "./themes.css";
import AiShell from "@/components/ai/AiShell";

export default function AiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AiShell>{children}</AiShell>;
}