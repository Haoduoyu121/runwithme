"use client";

import { useEffect, useState } from "react";
import {
  hasToken,
  login,
  setToken,
  clearToken,
} from "@/lib/syncClient";
import { syncEngine } from "@/lib/syncEngine";

const LAST_KEY = "runwithme_sync_last_v1";
const BOOT_FLAG = "runwithme_sync_boot_v1";

export default function SyncCard() {
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);

  useEffect(() => {
    setAuthed(hasToken());
    const t = localStorage.getItem(LAST_KEY);
    if (t) setLastSync(parseInt(t, 10));
  }, []);

  function markSyncTime() {
    const now = Date.now();
    localStorage.setItem(LAST_KEY, String(now));
    setLastSync(now);
  }

  async function handleLogin() {
    if (!user.trim() || !pass) {
      setMsg("请输入账号和密码");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const r = await login(user.trim(), pass);
      setToken(r.token, r.exp);
      setAuthed(true);
      setPass("");
      setMsg("登录成功，正在同步…");
      const res = await syncEngine.initialSync();
      syncEngine.startWatcher();
      markSyncTime();
      if (res.changed) {
        setMsg("正在刷新…");
        window.location.reload();
        return;
      }
      setMsg(
        `已同步（拉取 ${res.pulled}，推送 ${res.pushed}）`
      );
    } catch (e) {
      setMsg(
        "登录失败：" +
          (e instanceof Error ? e.message : String(e))
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleManualSync() {
    setBusy(true);
    setMsg("正在同步…");
    try {
      const res = await syncEngine.initialSync();
      markSyncTime();
      if (res.changed) {
        setMsg("有新数据，正在刷新…");
        window.location.reload();
        return;
      }
      setMsg(
        `已同步（拉取 ${res.pulled}，推送 ${res.pushed}）`
      );
    } catch (e) {
      setMsg(
        "同步失败：" +
          (e instanceof Error ? e.message : String(e))
      );
    } finally {
      setBusy(false);
    }
  }

  function handleLogout() {
    clearToken();
    syncEngine.stopWatcher();
    sessionStorage.removeItem(BOOT_FLAG);
    setAuthed(false);
    setMsg("已退出同步账号");
  }

  return (
    <div className="sync-card">
      <div className="sync-card-header">
        <span className="sync-card-title">跨设备同步</span>
        <span
          className={
            authed ? "sync-card-dot is-on" : "sync-card-dot"
          }
        />
      </div>

      {!authed ? (
        <>
          <p className="sync-card-desc">
            登录后，设置 / 聊天 / 书籍等会自动在设备间同步。
            图片、音乐等文件仍在本地。
          </p>
          <input
            className="sync-card-input"
            placeholder="账号"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            autoComplete="username"
          />
          <input
            className="sync-card-input"
            placeholder="密码"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoComplete="current-password"
          />
          <button
            className="sync-card-btn primary"
            disabled={busy}
            onClick={handleLogin}
          >
            {busy ? "登录中…" : "登录同步"}
          </button>
        </>
      ) : (
        <>
          <p className="sync-card-desc">
            {lastSync
              ? `上次同步：${new Date(lastSync).toLocaleString()}`
              : "已连接同步账号"}
          </p>
          <button
            className="sync-card-btn primary"
            disabled={busy}
            onClick={handleManualSync}
          >
            {busy ? "同步中…" : "立即同步"}
          </button>
          <button
            className="sync-card-btn"
            disabled={busy}
            onClick={handleLogout}
          >
            退出同步账号
          </button>
        </>
      )}

      {msg && <div className="sync-card-msg">{msg}</div>}
    </div>
  );
}
