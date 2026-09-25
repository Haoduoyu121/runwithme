"use client";

import { useCall } from "@/lib/CallContext";
import { useChat } from "@/lib/ChatContext";

import CallOverlay from "@/components/call/CallOverlay";
import CallFloat from "@/components/call/CallFloat";

/**
 * 全局通话 UI
 *
 * - phase = minimized → 悬浮窗（可拖动）
 * - 其他 phase       → 全屏通话界面
 * - 无通话            → 渲染 null
 *
 * 从 ChatContext 拿 generatingCount，
 * 显示「对方正在回复…」
 */
export default function CallUI() {
  const {
    activeCall,
    seconds,
    dialSeconds,
    acceptIncomingCall,
    declineIncomingCall,
    hangUpCall,
    minimizeCall,
    expandCall,
  } = useCall();

  const { generatingCount } = useChat();

  if (!activeCall) return null;

  const isReplying = generatingCount > 0;

  if (activeCall.phase === "minimized") {
    return (
      <CallFloat
        call={activeCall}
        seconds={seconds}
        dialSeconds={dialSeconds}
        isReplying={isReplying}
        onExpand={expandCall}
        onHangup={hangUpCall}
      />
    );
  }

  return (
    <CallOverlay
      call={activeCall}
      seconds={seconds}
      dialSeconds={dialSeconds}
      isReplying={isReplying}
      onAccept={acceptIncomingCall}
      onDecline={declineIncomingCall}
      onHangup={hangUpCall}
      onMinimize={minimizeCall}
    />
  );
}