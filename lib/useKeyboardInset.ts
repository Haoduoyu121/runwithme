"use client";

import { useEffect } from "react";

/**
 * 监听 iOS 键盘弹起高度，写到 CSS 变量 --kb-inset
 * 并通过 CustomEvent("runwithme:kb-change") 广播
 */
export function useKeyboardInset() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    let raf = 0;
    let last = -1;

    function update() {
      if (!vv) return;
      const inset = Math.max(
        0,
        window.innerHeight - vv.height - vv.offsetTop
      );
      document.documentElement.style.setProperty(
        "--kb-inset",
        `${inset}px`
      );

      if (inset !== last) {
        last = inset;
        window.dispatchEvent(
          new CustomEvent("runwithme:kb-change", {
            detail: { inset },
          })
        );
      }
    }

    function schedule() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    }

    update();
    vv.addEventListener("resize", schedule);
    vv.addEventListener("scroll", schedule);

    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener("resize", schedule);
      vv.removeEventListener("scroll", schedule);
      document.documentElement.style.setProperty(
        "--kb-inset",
        "0px"
      );
    };
  }, []);
}