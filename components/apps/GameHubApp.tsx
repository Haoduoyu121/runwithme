"use client";

import { useState } from "react";
import {
  ChevronLeft,
  Gamepad2,
  MessageSquare,
  Trophy,
} from "lucide-react";
import GomokuApp from "./GomokuApp";
import TicTacToeApp from "./TicTacToeApp";
import UnoApp from "./UnoApp";
import GameChatSettingsPanel from "./gameChat/GameChatSettingsPanel";
import ArcadeRecordPanel from "./arcade/ArcadeRecordPanel";

type Props = { onBack: () => void };
type Screen = "hub" | "gomoku" | "tictactoe" | "uno";

export default function GameHubApp({ onBack }: Props) {
  const [screen, setScreen] = useState<Screen>("hub");
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [showRecord, setShowRecord] = useState(false);

  if (screen === "gomoku")
    return <GomokuApp onBack={() => setScreen("hub")} />;
  if (screen === "tictactoe")
    return <TicTacToeApp onBack={() => setScreen("hub")} />;
  if (screen === "uno")
    return <UnoApp onBack={() => setScreen("hub")} />;

  return (
    <div className="gh-app">
      <header className="gh-topbar">
        <button
          className="gh-icon-btn"
          onClick={onBack}
          aria-label="返回"
        >
          <ChevronLeft size={22} strokeWidth={2.2} />
        </button>
        <div className="gh-title">Arcade</div>
        <button
          className="gh-icon-btn"
          onClick={() => setShowRecord(true)}
          title="战绩与奖惩"
          aria-label="战绩与奖惩"
        >
          <Trophy size={17} strokeWidth={2.2} />
        </button>
        <button
          className="gh-icon-btn"
          onClick={() => setShowChatSettings(true)}
          title="聊天字卡"
          aria-label="聊天字卡"
        >
          <MessageSquare size={17} strokeWidth={2.2} />
        </button>
      </header>

      <div className="gh-content">
        <div className="gh-head">
          <Gamepad2 size={30} strokeWidth={1.6} className="gh-head-icon" />
          <div className="gh-head-title">游戏厅</div>
          <div className="gh-head-sub">挑一个，一起玩</div>
        </div>

        <div className="gh-grid">
          <button
            className="gh-tile"
            onClick={() => setScreen("gomoku")}
          >
            <div className="gh-tile-symbol">◉</div>
            <div className="gh-tile-name">五子棋</div>
            <div className="gh-tile-desc">连成五子，胜者为王</div>
          </button>

          <button
            className="gh-tile"
            onClick={() => setScreen("tictactoe")}
          >
            <div className="gh-tile-symbol">#</div>
            <div className="gh-tile-name">井字棋</div>
            <div className="gh-tile-desc">三子连线，含三人局</div>
          </button>

          <button
            className="gh-tile"
            onClick={() => setScreen("uno")}
          >
            <div className="gh-tile-symbol">U</div>
            <div className="gh-tile-name">UNO</div>
            <div className="gh-tile-desc">完整版规则</div>
          </button>
        </div>
      </div>

      {showChatSettings && (
        <GameChatSettingsPanel
          onClose={() => setShowChatSettings(false)}
        />
      )}

      {showRecord && (
        <ArcadeRecordPanel onClose={() => setShowRecord(false)} />
      )}
    </div>
  );
}