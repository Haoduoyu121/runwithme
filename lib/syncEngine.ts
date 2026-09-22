/* RunWithme 跨设备同步 - 引擎 */

import * as client from "./syncClient";

const PREFIX = "runwithme_";
const META_KEY = "runwithme_sync_meta_v1";

/* 这些 key 只存本地，不参与同步 */
const EXCLUDE_KEYS = new Set<string>([
  META_KEY,
  "runwithme_sync_token_v1",
  "runwithme_sync_token_exp_v1",
  "runwithme_sync_boot_v1",
  "runwithme_sync_last_v1",
]);

function loadMeta(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveMeta(m: Record<string, number>) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

function collectLocal(): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (!k.startsWith(PREFIX)) continue;
    if (EXCLUDE_KEYS.has(k)) continue;
    const v = localStorage.getItem(k);
    if (v !== null) out[k] = v;
  }
  return out;
}

class SyncEngine {
  private meta: Record<string, number> = {};
  private snapshot: Record<string, string> = {};
  private pending: Record<string, string> = {};
  private scanTimer: number | null = null;
  private flushTimer: number | null = null;
  private running = false;

  startWatcher() {
    if (this.running) return;
    this.running = true;
    this.meta = loadMeta();
    this.snapshot = collectLocal();
    this.scanTimer = window.setInterval(() => this.tick(), 2000);
  }

  stopWatcher() {
    if (this.scanTimer !== null) {
      window.clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    if (this.flushTimer !== null) {
      window.clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.running = false;
  }

  /* 打开时拉取合并 */
  async initialSync(): Promise<{
    pulled: number;
    pushed: number;
    changed: boolean;
  }> {
    const remote = await client.fetchAll();
    const local = collectLocal();
    let pulled = 0;
    let changed = false;

    for (const [k, r] of Object.entries(remote.items || {})) {
      if (!k.startsWith(PREFIX)) continue;
      if (EXCLUDE_KEYS.has(k)) continue;
      const localVal = local[k];
      const localAt = this.meta[k] || 0;
      if (localVal === undefined || localAt < r.updatedAt) {
        if (localVal !== r.value) changed = true;
        localStorage.setItem(k, r.value);
        this.meta[k] = r.updatedAt;
        pulled++;
      }
    }

    const toPush: client.RemoteItems = {};
    for (const [k, v] of Object.entries(local)) {
      const localAt = this.meta[k] || 0;
      const r = remote.items?.[k];
      if (!r || localAt > r.updatedAt) {
        toPush[k] = {
          value: v,
          updatedAt: localAt || Date.now(),
        };
        this.meta[k] = toPush[k].updatedAt;
      }
    }
    if (Object.keys(toPush).length > 0) {
      await client.pushAll(toPush);
    }

    saveMeta(this.meta);
    this.snapshot = collectLocal();
    return {
      pulled,
      pushed: Object.keys(toPush).length,
      changed,
    };
  }

  /* 手动全量推 */
  async pushNow(): Promise<{ pushed: number }> {
    const local = collectLocal();
    const payload: client.RemoteItems = {};
    const now = Date.now();
    for (const [k, v] of Object.entries(local)) {
      this.meta[k] = now;
      payload[k] = { value: v, updatedAt: now };
    }
    if (Object.keys(payload).length === 0) return { pushed: 0 };
    await client.pushAll(payload);
    saveMeta(this.meta);
    this.snapshot = collectLocal();
    return { pushed: Object.keys(payload).length };
  }

  private tick() {
    const cur = collectLocal();
    let hasChange = false;
    for (const [k, v] of Object.entries(cur)) {
      if (this.snapshot[k] !== v) {
        this.meta[k] = Date.now();
        this.pending[k] = v;
        hasChange = true;
      }
    }
    this.snapshot = cur;
    if (hasChange) {
      saveMeta(this.meta);
      this.scheduleFlush();
    }
  }

  private scheduleFlush() {
    if (this.flushTimer !== null) return;
    this.flushTimer = window.setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, 1500);
  }

  private async flush() {
    const items = { ...this.pending };
    this.pending = {};
    const payload: client.RemoteItems = {};
    for (const [k, v] of Object.entries(items)) {
      payload[k] = {
        value: v,
        updatedAt: this.meta[k] || Date.now(),
      };
    }
    try {
      await client.pushAll(payload);
    } catch (e) {
      console.warn("[sync] 推送失败，稍后重试:", e);
      Object.assign(this.pending, items);
      this.scheduleFlush();
    }
  }
}

export const syncEngine = new SyncEngine();
