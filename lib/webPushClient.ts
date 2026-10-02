"use client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://api.yulewin.cn";

/* ---------- 工具 ---------- */

function urlBase64ToArrayBuffer(
  base64String: string
): ArrayBuffer {
  const padding = "=".repeat(
    (4 - (base64String.length % 4)) % 4
  );
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    view[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

/* ---------- 环境检测 ---------- */

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** iOS 上必须从"已添加到主屏"的 PWA 打开才能订阅 */
export function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  /* iOS 专用 */
  if (
    (window.navigator as unknown as { standalone?: boolean })
      .standalone === true
  ) {
    return true;
  }
  /* 通用 */
  return window.matchMedia(
    "(display-mode: standalone)"
  ).matches;
}

export function getPermission(): NotificationPermission {
  if (typeof window === "undefined") return "default";
  if (!("Notification" in window)) return "default";
  return Notification.permission;
}

/* ---------- 注册 SW ---------- */

let registrationPromise: Promise<ServiceWorkerRegistration> | null =
  null;

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  if (registrationPromise) return registrationPromise;
  registrationPromise = navigator.serviceWorker.register(
    "/sw.js",
    { scope: "/" }
  );
  return registrationPromise;
}

/* ---------- 订阅 ---------- */

export async function subscribePush(): Promise<{
  ok: boolean;
  reason?: string;
}> {
  if (!isPushSupported()) {
    return { ok: false, reason: "unsupported" };
  }
  if (!isStandalonePWA()) {
    return { ok: false, reason: "not-standalone" };
  }

  /* 1. 请求权限 */
  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    return { ok: false, reason: "permission-denied" };
  }

  /* 2. 拿 VAPID 公钥 */
  const keyRes = await fetch(
    `${API_BASE}/api/push/vapid-public-key`
  );
  if (!keyRes.ok) {
    return { ok: false, reason: "server-no-key" };
  }
  const keyJson = (await keyRes.json()) as { key?: string };
  if (!keyJson.key) {
    return { ok: false, reason: "server-no-key" };
  }

  /* 3. 注册 SW + 订阅 */
  const reg = await getRegistration();
  await navigator.serviceWorker.ready;

  let sub: PushSubscription | null = null;
  try {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToArrayBuffer(
        keyJson.key
      ),
    });
  } catch (e) {
    console.error("pushManager.subscribe 失败:", e);
    return { ok: false, reason: "subscribe-failed" };
  }

  if (!sub) return { ok: false, reason: "subscribe-failed" };

  /* 4. 上传到服务器 */
  const body = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.toJSON().keys?.p256dh ?? "",
      auth: sub.toJSON().keys?.auth ?? "",
    },
    tag: "default",
  };

  const upRes = await fetch(
    `${API_BASE}/api/push/subscribe`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!upRes.ok) {
    return { ok: false, reason: "upload-failed" };
  }

  return { ok: true };
}

/* ---------- 取消订阅 ---------- */

export async function unsubscribePush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const reg = await navigator.serviceWorker.getRegistration(
      "/"
    );
    if (!reg) return true;

    const sub = await reg.pushManager.getSubscription();
    if (!sub) return true;

    const endpoint = sub.endpoint;

    /* 通知服务器删掉 */
    await fetch(`${API_BASE}/api/push/unsubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    }).catch(() => null);

    await sub.unsubscribe();
    return true;
  } catch (e) {
    console.error("unsubscribe 失败:", e);
    return false;
  }
}

/* ---------- 查询当前订阅状态 ---------- */

export async function getSubscriptionState(): Promise<{
  supported: boolean;
  standalone: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
}> {
  if (!isPushSupported()) {
    return {
      supported: false,
      standalone: false,
      permission: "default",
      subscribed: false,
    };
  }
  const standalone = isStandalonePWA();
  const permission = Notification.permission;

  let subscribed = false;
  try {
    const reg = await navigator.serviceWorker.getRegistration(
      "/"
    );
    if (reg) {
      const sub = await reg.pushManager.getSubscription();
      subscribed = !!sub;
    }
  } catch {
    subscribed = false;
  }

  return {
    supported: true,
    standalone,
    permission,
    subscribed,
  };
}