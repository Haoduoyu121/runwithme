export type NotificationPermissionState =
  | "granted"
  | "denied"
  | "default"
  | "unsupported";

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined") {
    return "unsupported";
  }

  if (!("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (!("Notification" in window)) return false;

  if (Notification.permission === "granted") return true;

  if (Notification.permission === "denied") return false;

  try {
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}

export function sendNotification(
  title: string,
  body: string,
  tag?: string
): boolean {
  if (typeof window === "undefined") return false;

  if (!("Notification" in window)) return false;

  if (Notification.permission !== "granted") return false;

  try {
    const notification = new Notification(title, {
      body,
      tag,
      silent: false,
    });

    /* 点通知时聚焦到窗口 */
    notification.onclick = () => {
      try {
        window.focus();
      } catch {
        /* ignore */
      }

      notification.close();
    };

    return true;
  } catch (error) {
    console.warn("发送通知失败", error);
    return false;
  }
}