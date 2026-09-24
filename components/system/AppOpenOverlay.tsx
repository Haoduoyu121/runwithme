"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

export type OpenTransition = {
  appId: string;
  rect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  color: string;
  radius: number;
};

const DURATION = 400;
const FADE_DELAY = 200;
const FADE_MS = 200;
const WATCHDOG_MS = 700;

export default function AppOpenOverlay({
  transition,
  onFinish,
}: {
  transition: OpenTransition;
  onFinish: () => void;
}) {
  /* ★ 用 ref 存 onFinish，避免父组件重渲染时 timer 被重置 */
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useLayoutEffect(() => {
    const original = document.querySelector(
      `[data-app-icon="${transition.appId}"]`
    ) as HTMLElement | null;
    if (!original) {
      onFinishRef.current();
      return;
    }

    const rect = original.getBoundingClientRect();
    const clone = original.cloneNode(true) as HTMLElement;

    clone.style.position = "fixed";
    clone.style.left = `${rect.left}px`;
    clone.style.top = `${rect.top}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.margin = "0";
    clone.style.padding = "0";
    clone.style.zIndex = "100000";
    clone.style.pointerEvents = "none";
    clone.style.transformOrigin = "center center";
    clone.style.transform = "translate(0, 0) scale(1)";
    clone.style.transition = "none";
    clone.style.willChange = "transform, opacity, border-radius";
    clone.style.borderRadius = `${transition.radius}px`;
    clone.style.backfaceVisibility = "hidden";
    clone.style.webkitBackfaceVisibility = "hidden";
    clone.querySelectorAll("*").forEach((n) => {
      const el = n as HTMLElement;
      el.style.backfaceVisibility = "hidden";
      el.style.webkitBackfaceVisibility = "hidden";
    });

    document.body.appendChild(clone);

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const scale =
      (Math.max(window.innerWidth, window.innerHeight) * 1.15) /
      Math.max(rect.width, rect.height, 1);
    const dx = cx - (rect.left + rect.width / 2);
    const dy = cy - (rect.top + rect.height / 2);

    const r = requestAnimationFrame(() => {
      clone.style.transition = [
        `transform ${DURATION}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        `opacity ${FADE_MS}ms ease-out ${FADE_DELAY}ms`,
        `border-radius ${DURATION}ms ease-out`,
      ].join(", ");
      clone.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
      clone.style.borderRadius = "0px";
      clone.style.opacity = "0";
    });

    return () => {
      cancelAnimationFrame(r);
      clone.remove();
    };
  }, [transition.appId]);

  /* ★ 只跑一次：用 ref 里的 onFinish，不依赖 onFinish 引用 */
  useEffect(() => {
    const t = window.setTimeout(() => {
      onFinishRef.current();
    }, WATCHDOG_MS);
    return () => window.clearTimeout(t);
  }, []);

  return null;
}