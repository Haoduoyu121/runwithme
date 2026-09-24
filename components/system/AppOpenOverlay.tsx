"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

export type OpenTransition = {
  /** 用于在 DOM 里找到原图标 */
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

export default function AppOpenOverlay({
  transition,
  onFinish,
}: {
  transition: OpenTransition;
  onFinish: () => void;
}) {
  const cloneRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const original = document.querySelector(
      `[data-app-icon="${transition.appId}"]`
    ) as HTMLElement | null;
    if (!original) {
      /* 找不到原图标（比如自定义图标未加载），直接跳过 */
      onFinish();
      return;
    }

    const rect = original.getBoundingClientRect();
    const clone = original.cloneNode(true) as HTMLElement;

    /* 冻结 clone，让它固定原位置，不受父级影响 */
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
    /* 让子元素也继承 backface 隐藏，防止翻转变形 */
    clone.querySelectorAll("*").forEach((n) => {
      const el = n as HTMLElement;
      el.style.backfaceVisibility = "hidden";
      el.style.webkitBackfaceVisibility = "hidden";
    });

    document.body.appendChild(clone);
    cloneRef.current = clone;

    /* 目标：移到屏幕中心 + 放大到铺满 */
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const scale =
      (Math.max(window.innerWidth, window.innerHeight) * 1.15) /
      Math.max(rect.width, rect.height, 1);
    const dx = cx - (rect.left + rect.width / 2);
    const dy = cy - (rect.top + rect.height / 2);

    /* 下一帧启动动画（关键：先渲染初始状态再改，否则 transition 不触发） */
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
      cloneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transition.appId]);

  useEffect(() => {
    const t = window.setTimeout(onFinish, DURATION + 40);
    return () => window.clearTimeout(t);
  }, [onFinish]);

  /* 不需要渲染任何东西 —— 动画都在 clone 上 */
  return null;
}