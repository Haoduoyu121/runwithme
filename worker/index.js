/* =========================================================
   Runwithme · next-pwa 自定义 worker
   会被 @ducanh2912/next-pwa 打进最终的 sw.js
   ========================================================= */

/* ---------- 接收推送 ---------- */

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = {
      title: "Runwithme",
      body: event.data ? event.data.text() : "",
    };
  }

  const title = payload.title || "Runwithme";
  const options = {
    body: payload.body || "",
    tag: payload.tag || "runwithme-default",
    renotify: false,
    data: {
      url: payload.url || "/",
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

/* ---------- 点击通知 ---------- */

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url =
    (event.notification.data && event.notification.data.url) ||
    "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const c of allClients) {
        if ("focus" in c) {
          try {
            await c.focus();
            if ("navigate" in c) {
              await c.navigate(url);
            }
            return;
          } catch (e) {
            /* 继续尝试其他窗口 */
          }
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })()
  );
});