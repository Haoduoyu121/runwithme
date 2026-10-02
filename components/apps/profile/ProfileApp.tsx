"use client";

import { useEffect, useState } from "react";

import {
  ChevronRight,
  Target,
  Wallet as WalletIcon,
} from "lucide-react";

import { useSystem } from "@/lib/SystemContext";

import {
  saveChatFile,
  getChatFile,
} from "@/lib/chatFiles";

import { loadWallet } from "@/lib/walletStorage";

import {
  computeBalance,
  formatMoney,
  type WalletData,
} from "@/data/wallet";

import WalletPage from "./WalletPage";
import WalletDetailPage from "./WalletDetailPage";
import SavingGoalsPage from "./SavingGoalsPage";
import AvatarLibraryPage from "@/components/apps/potato/AvatarLibraryPage";

type View =
  | { kind: "home" }
  | { kind: "wallet" }
  | { kind: "detail" }
  | { kind: "goals" }
  | { kind: "avatarLib" };

type Props = {
  onSubpageChange?: (isSub: boolean) => void;
};

export default function ProfileApp({
  onSubpageChange,
}: Props) {
  const { settings, updateSettings } = useSystem();
  const names = settings.characterNames;

  const [view, setView] = useState<View>({ kind: "home" });

  /* 通知父组件：是否处于子页面 */
  useEffect(() => {
    onSubpageChange?.(view.kind !== "home");
  }, [view.kind, onSubpageChange]);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    null
  );
  const [nameDraft, setNameDraft] = useState(names.you);
  const [wallet, setWallet] = useState<WalletData>(loadWallet);

  useEffect(() => {
    setNameDraft(names.you);
  }, [names.you]);

  /* 加载头像 */
  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;

    async function load() {
      const file = await getChatFile("avatar-you");
      if (!file || cancelled) return;
      url = URL.createObjectURL(file);
      setAvatarUrl(url);
    }

    void load();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [settings.avatars.you]);

  /* 监听换头像事件 */
  useEffect(() => {
    function onAvatarUpdated() {
      setAvatarUrl(null);
      void (async () => {
        const file = await getChatFile("avatar-you");
        if (!file) return;
        const u = URL.createObjectURL(file);
        setAvatarUrl(u);
      })();
    }
    window.addEventListener(
      "runwithme:chat-avatar-updated",
      onAvatarUpdated
    );
    return () => {
      window.removeEventListener(
        "runwithme:chat-avatar-updated",
        onAvatarUpdated
      );
    };
  }, []);

  /* 监听钱包变化 */
  useEffect(() => {
    function onWalletUpdated() {
      setWallet(loadWallet());
    }
    window.addEventListener(
      "runwithme:wallet-updated",
      onWalletUpdated
    );
    return () => {
      window.removeEventListener(
        "runwithme:wallet-updated",
        onWalletUpdated
      );
    };
  }, []);

  async function uploadAvatar(file: File) {
    await saveChatFile("avatar-you", file);
    const url = URL.createObjectURL(file);
    setAvatarUrl(url);
    updateSettings({
      avatars: { ...settings.avatars, you: "custom" },
    });
    window.dispatchEvent(
      new Event("runwithme:chat-avatar-updated")
    );
  }

  function saveName() {
    const t = nameDraft.trim();
    if (!t) return;
    updateSettings({
      characterNames: {
        ...settings.characterNames,
        you: t,
      },
    });
  }

  /* ---------- 子页面 ---------- */

  if (view.kind === "wallet") {
    return (
      <WalletPage
        onBack={() => setView({ kind: "home" })}
        onOpenDetail={() => setView({ kind: "detail" })}
      />
    );
  }

  if (view.kind === "detail") {
    return (
      <WalletDetailPage
        onBack={() => setView({ kind: "wallet" })}
      />
    );
  }

  if (view.kind === "goals") {
    return (
      <SavingGoalsPage
        onBack={() => setView({ kind: "home" })}
      />
    );
  }

  if (view.kind === "avatarLib") {
    return (
      <AvatarLibraryPage
        owner="You"
        onBack={() => setView({ kind: "home" })}
      />
    );
  }

  /* ---------- 主页 ---------- */

  const balance = computeBalance(wallet);
  const goals = wallet.goals;
  const activeGoals = goals.filter((g) => !g.completed);
  const completedGoals = goals.filter((g) => g.completed);

  return (
    <div className="profile-app">
      <div className="profile-scroll">
        {/* 头像 + 名字 */}
        <div className="profile-hero">
          <label className="profile-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt={names.you} />
            ) : (
              <span>
                {names.you.charAt(0).toUpperCase() || "Y"}
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              className="ios-file-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadAvatar(file);
                e.target.value = "";
              }}
            />
          </label>

          <input
            className="profile-name-input"
            value={nameDraft}
            onChange={(e) =>
              setNameDraft(e.target.value)
            }
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveName();
                (e.target as HTMLInputElement).blur();
              }
            }}
            maxLength={16}
            placeholder={names.you}
          />

          <button
            type="button"
            className="profile-avatar-lib-btn"
            onClick={() => setView({ kind: "avatarLib" })}
          >
            我的头像库
          </button>
        </div>

        {/* 钱包卡片 */}
        <button
          type="button"
          className="profile-card"
          onClick={() => setView({ kind: "wallet" })}
        >
          <div className="profile-card-icon wallet">
            <WalletIcon size={20} strokeWidth={2} />
          </div>
          <div className="profile-card-content">
            <div className="profile-card-title">钱包</div>
            <div className="profile-card-sub">
              余额 {formatMoney(balance, wallet.currency)}
            </div>
          </div>
          <ChevronRight
            size={20}
            className="profile-card-arrow"
          />
        </button>

        {/* 存钱本卡片 */}
        <button
          type="button"
          className="profile-card"
          onClick={() => setView({ kind: "goals" })}
        >
          <div className="profile-card-icon target">
            <Target size={20} strokeWidth={2} />
          </div>
          <div className="profile-card-content">
            <div className="profile-card-title">存钱本</div>
            <div className="profile-card-sub">
              {goals.length === 0
                ? "还没有目标"
                : `${activeGoals.length} 个进行中 · ${completedGoals.length} 个已完成`}
            </div>
          </div>
          <ChevronRight
            size={20}
            className="profile-card-arrow"
          />
        </button>
      </div>
    </div>
  );
}