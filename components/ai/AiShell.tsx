"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  Settings as SettingsIcon,
  Palette,
} from "lucide-react";
import AiThemeSwitcher from "./AiThemeSwitcher";
import {
  loadTheme,
  loadCustom,
  toStyle,
  type AiThemeId,
} from "@/lib/ai/theme";

export default function AiShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [themeId, setThemeId] = useState<AiThemeId>("library");
  const [customStyle, setCustomStyle] =
    useState<React.CSSProperties>({});
  const [showTheme, setShowTheme] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setThemeId(loadTheme());
    setCustomStyle(toStyle(loadCustom()));
  }, []);

  useEffect(() => {
    function onUpdate() {
      setThemeId(loadTheme());
      setCustomStyle(toStyle(loadCustom()));
    }
    window.addEventListener("ai-theme-update", onUpdate);
    return () =>
      window.removeEventListener("ai-theme-update", onUpdate);
  }, []);

  const isHome = pathname === "/ai";

  return (
    <div
      className="ai-root"
      data-ai-theme={themeId}
      style={customStyle}
    >
      <header className="ai-topbar">
        {isHome ? (
          <div style={{ width: 36 }} />
        ) : (
          <Link
            href="/ai"
            className="ai-icon-btn"
            aria-label="返回"
          >
            <ChevronLeft size={20} strokeWidth={2.2} />
          </Link>
        )}
        <div className="ai-topbar-title">Beyond the Pages</div>
        <button
          className="ai-icon-btn"
          onClick={() => setShowTheme(true)}
          aria-label="主题"
        >
          <Palette size={18} strokeWidth={2.2} />
        </button>
        <Link
          href="/ai/settings"
          className="ai-icon-btn"
          aria-label="设置"
        >
          <SettingsIcon size={18} strokeWidth={2.2} />
        </Link>
      </header>
      <main className="ai-content">{children}</main>
      {showTheme && (
        <AiThemeSwitcher onClose={() => setShowTheme(false)} />
      )}
    </div>
  );
}