"use client";

import { useEffect, useState } from "react";

import {
  Loader2,
  Plus,
  RefreshCw,
  Rss,
  Trash2,
  X,
} from "lucide-react";

import {
  accumulateSubscription,
  addSubscription,
  getSubscription,
  loadSubscriptions,
  removeSubscription,
  type RssSubscription,
} from "@/lib/rssSubscriptions";

type RssSubscriptionsProps = {
  onAdded: (bookId: string) => void;
};

function formatRelTime(ts: number): string {
  if (!ts) return "从未更新";
  const diff = Date.now() - ts;
  if (diff < 60 * 1000) return "刚刚";
  if (diff < 60 * 60 * 1000) {
    return `${Math.floor(diff / 60000)} 分钟前`;
  }
  if (diff < 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / 3600000)} 小时前`;
  }
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function RssSubscriptions({
  onAdded,
}: RssSubscriptionsProps) {
  const [subs, setSubs] = useState<RssSubscription[]>(
    []
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [busyLabel, setBusyLabel] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [addUrl, setAddUrl] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addErr, setAddErr] = useState("");

  useEffect(() => {
    setSubs(loadSubscriptions());
  }, []);

  function refresh() {
    setSubs(loadSubscriptions());
  }

  /* ---------- 添加订阅 ---------- */

  async function handleAdd() {
    if (addBusy) return;
    setAddErr("");

    const url = addUrl.trim();
    if (!url) {
      setAddErr("请填写 RSS 链接");
      return;
    }

    setAddBusy(true);
    try {
      const { sub, initialItemCount } =
        await addSubscription(url);
      setShowAdd(false);
      setAddUrl("");
      refresh();

      /* 首次自动累积一次，让用户直接能读 */
      await handleOpen(sub.id);

      console.log(
        `[RSS] 订阅成功，共 ${initialItemCount} 条`
      );
    } catch (e) {
      console.error("[RSS] 添加失败:", e);
      setAddErr(
        e instanceof Error ? e.message : "添加失败"
      );
    } finally {
      setAddBusy(false);
    }
  }

  /* ---------- 打开：拉最新 + 累积 + 进阅读器 ---------- */

  async function handleOpen(subId: string) {
    if (busy) return;
    const sub = getSubscription(subId);
    if (!sub) return;

    setBusy(subId);
    setBusyLabel("拉取中…");

    try {
      setBusyLabel("解析中…");
      const out = await accumulateSubscription(subId);

      if (out.bookId) {
        if (out.added === 0) {
          console.log("[RSS] 无新内容，直接打开");
        } else {
          console.log(
            `[RSS] 新增 ${out.added} 章，用时 ${out.tookMs}ms`
          );
        }
        onAdded(out.bookId);
      } else {
        alert("这个订阅里还没有任何内容");
      }
    } catch (e) {
      console.error("[RSS] 累积失败:", e);
      alert(
        "拉取失败：\n" +
          (e instanceof Error ? e.message : "未知错误")
      );
    } finally {
      setBusy(null);
      setBusyLabel("");
      refresh();
    }
  }

  /* ---------- 删除 ---------- */

  function handleDelete(sub: RssSubscription) {
    if (
      !window.confirm(
        `取消订阅「${sub.title}」？\n\n` +
          `已经累积到本地书的章节不会删除。`
      )
    ) {
      return;
    }
    removeSubscription(sub.id);
    refresh();
  }

  return (
    <div className="rss-root">
      <div className="rss-topbar">
        <div className="rss-topbar-title">订阅</div>
        <button
          className="rss-topbar-action"
          onClick={() => setShowAdd(true)}
        >
          <Plus size={13} strokeWidth={2.6} />
          添加订阅
        </button>
      </div>

      {subs.length === 0 ? (
        <div className="rss-empty">
          <div className="rss-empty-icon">
            <Rss size={30} strokeWidth={1.6} />
          </div>
          <div className="rss-empty-title">
            还没有订阅
          </div>
          <div className="rss-empty-desc">
            订阅 RSS / Atom 链接，新章节会自动
            累积成本地书，离线也能读
          </div>
          <button
            className="rss-empty-btn"
            onClick={() => setShowAdd(true)}
          >
            <Plus size={14} strokeWidth={2.6} />
            添加订阅
          </button>
        </div>
      ) : (
        <div className="rss-list">
          {subs.map((s) => (
            <div key={s.id} className="rss-item">
              <button
                className="rss-item-main"
                onClick={() => void handleOpen(s.id)}
                disabled={busy !== null}
              >
                <div className="rss-item-title">
                  {s.title}
                </div>
                <div className="rss-item-meta">
                  <span>
                    已累积 {s.seenItemIds.length} 章
                  </span>
                  <span className="rss-item-dot">
                    ·
                  </span>
                  <span>
                    {formatRelTime(s.lastFetchedAt)}
                  </span>
                </div>
                <div className="rss-item-url">{s.url}</div>
              </button>

              <button
                className="rss-item-delete"
                onClick={() => handleDelete(s)}
                aria-label="取消订阅"
                disabled={busy !== null}
              >
                <Trash2 size={14} strokeWidth={2.2} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 添加弹窗 */}
      {showAdd && (
        <div
          className="rss-add-backdrop"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="rss-add"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rss-add-header">
              <h3>添加订阅</h3>
              <button
                onClick={() => setShowAdd(false)}
                aria-label="关闭"
              >
                <X size={15} strokeWidth={2.2} />
              </button>
            </div>

            <div className="rss-add-body">
              <label className="rss-add-field">
                <span>RSS / Atom 链接</span>
                <input
                  type="text"
                  value={addUrl}
                  onChange={(e) =>
                    setAddUrl(e.target.value)
                  }
                  placeholder="https://example.com/feed.xml"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </label>

              <p className="rss-add-hint">
                常见格式：以 .xml / /feed / /rss 结尾的链接。
                拉取会走你在「链接」tab 里配置的代理。
              </p>

              {addErr && (
                <div className="rss-add-error">
                  {addErr}
                </div>
              )}
            </div>

            <div className="rss-add-footer">
              <button
                className="rss-btn ghost"
                onClick={() => setShowAdd(false)}
                disabled={addBusy}
              >
                取消
              </button>
              <button
                className="rss-btn"
                onClick={() => void handleAdd()}
                disabled={addBusy}
              >
                {addBusy ? (
                  <>
                    <Loader2
                      size={13}
                      strokeWidth={2.4}
                      className="rss-spin"
                    />
                    验证中…
                  </>
                ) : (
                  "添加"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 累积进度浮层 */}
      {busy && (
        <div className="rss-progress">
          <Loader2
            size={15}
            strokeWidth={2.4}
            className="rss-spin"
          />
          <span>{busyLabel}</span>
        </div>
      )}
    </div>
  );
}