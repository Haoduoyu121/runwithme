"use client";

import { useCall } from "@/lib/CallContext";

import CallOverlay from "@/components/call/CallOverlay";
import CallFloat from "@/components/call/CallFloat";

/**
 * 全局通话 UI
 *
 * - phase = minimized → 悬浮窗（可拖动）
 * - 其他 phase       → 全屏通话界面
 * - 无通话            → 渲染 null
 */
export default function CallUI() {
  const {
    activeCall,
    seconds,
    acceptIncomingCall,
    declineIncomingCall,
    hangUpCall,
    minimizeCall,
    expandCall,
  } = useCall();

  if (!activeCall) return null;

  if (activeCall.phase === "minimized") {
    return (
      <CallFloat
        call={activeCall}
        seconds={seconds}
        onExpand={expandCall}
        onHangup={hangUpCall}
      />
    );
  }

  return (
    <CallOverlay
      call={activeCall}
      seconds={seconds}
      onAccept={acceptIncomingCall}
      onDecline={declineIncomingCall}
      onHangup={hangUpCall}
      onMinimize={minimizeCall}
    />
  );
}