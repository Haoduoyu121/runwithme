"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { AppId } from "@/lib/systemStorage";

export type NotificationCharacter =
  | "Levi"
  | "Erwin"
  | "you"
  | null;

export type AppNotification = {
  id: string;
  appId: AppId;
  character: NotificationCharacter;
  title: string;
  body: string;
  at: number;
};

export type NotifyOptions = {
  /* 仅当页面隐藏时才通知（调用方自己在 visible 时有 UI 兜底） */
  onlySystemIfHidden?: boolean;
};

type Launcher = (appId: AppId) => void;

export type NotificationPermissionState =
  | NotificationPermission
  | "unsupported";

type NotificationContextValue = {
  notifications: AppNotification[];
  notify: (
    n: Omit<AppNotification, "id" | "at">,
    options?: NotifyOptions
  ) => string;
  dismiss: (id: string) => void;
  clearAll: () => void;
  registerLauncher: (fn: Launcher) => void;
  launchApp: (appId: AppId) => void;
  permission: NotificationPermissionState;
  requestPermission: () => Promise<boolean>;
};

const NotificationContext =
  createContext<NotificationContextValue | null>(null);

const MAX_STACK = 3;
const AUTO_DISMISS = 6000;

function uid(): string {
  return `notif-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export function NotificationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [notifications, setNotifications] = useState<
    AppNotification[]
  >([]);

  const [permission, setPermission] =
    useState<NotificationPermissionState>("default");

  const launcherRef = useRef<Launcher | null>(null);
  const timersRef = useRef<Map<string, number>>(new Map());

  /* 初始化权限状态 */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined") return false;
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch {
      return false;
    }
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.filter((n) => n.id !== id)
    );
    const t = timersRef.current.get(id);
    if (t !== undefined) {
      window.clearTimeout(t);
      timersRef.current.delete(id);
    }
  }, []);

  const sendSystemNotification = useCallback(
    (n: AppNotification) => {
      if (typeof window === "undefined") return;
      if (!("Notification" in window)) return;
      if (Notification.permission !== "granted") {
        console.warn(
          "[Notification] 系统通知未授权，跳过：",
          n.title,
          n.body
        );
        return;
      }

      try {
        const notif = new Notification(n.title, {
          body: n.body,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          tag: `rw-${n.appId}-${n.character ?? "sys"}`,
        });

        notif.onclick = () => {
          try {
            window.focus();
          } catch {
            /* ignore */
          }
          /* 等窗口拿到焦点后再跳 */
          window.setTimeout(() => {
            launcherRef.current?.(n.appId);
          }, 150);
          notif.close();
        };
      } catch (err) {
        console.warn(
          "[Notification] 系统通知失败：",
          err
        );
      }
    },
    []
  );

  const notify = useCallback(
    (
      n: Omit<AppNotification, "id" | "at">,
      options?: NotifyOptions
    ) => {
      const id = uid();
      const full: AppNotification = {
        ...n,
        id,
        at: Date.now(),
      };

      const isHidden =
        typeof document !== "undefined" &&
        document.visibilityState === "hidden";

      /* 页面隐藏 → 系统通知 */
      if (isHidden) {
        sendSystemNotification(full);
        return id;
      }

      /* 页面可见但调用方要求只处理隐藏场景 → 什么都不做 */
      if (options?.onlySystemIfHidden) {
        return id;
      }

      /* 页面可见 → 弹站内玻璃卡片 */
      setNotifications((prev) =>
        [full, ...prev].slice(0, MAX_STACK)
      );

      const timer = window.setTimeout(() => {
        dismiss(id);
      }, AUTO_DISMISS);
      timersRef.current.set(id, timer);

      return id;
    },
    [dismiss, sendSystemNotification]
  );

  const clearAll = useCallback(() => {
    timersRef.current.forEach((t) =>
      window.clearTimeout(t)
    );
    timersRef.current.clear();
    setNotifications([]);
  }, []);

  const registerLauncher = useCallback((fn: Launcher) => {
    launcherRef.current = fn;
  }, []);

  const launchApp = useCallback((appId: AppId) => {
    launcherRef.current?.(appId);
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers.clear();
    };
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        notify,
        dismiss,
        clearAll,
        registerLauncher,
        launchApp,
        permission,
        requestPermission,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used inside NotificationProvider"
    );
  }
  return ctx;
}