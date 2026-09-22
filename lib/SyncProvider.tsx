"use client";

import { useEffect, useRef } from "react";
import { hasToken } from "./syncClient";
import { syncEngine } from "./syncEngine";

const BOOT_FLAG = "runwithme_sync_boot_v1";

export function SyncProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    if (!hasToken()) return;

    const firstBoot = !sessionStorage.getItem(BOOT_FLAG);
    (async () => {
      try {
        if (firstBoot) {
          sessionStorage.setItem(BOOT_FLAG, "1");
          const r = await syncEngine.initialSync();
          syncEngine.startWatcher();
          if (r.changed) {
            window.location.reload();
            return;
          }
        } else {
          syncEngine.startWatcher();
        }
      } catch (e) {
        console.warn("[sync] 启动同步失败:", e);
        try {
          syncEngine.startWatcher();
        } catch {
          /* ignore */
        }
      }
    })();

    return () => {
      syncEngine.stopWatcher();
    };
  }, []);

  return <>{children}</>;
}
