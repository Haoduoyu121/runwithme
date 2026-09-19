"use client";

import { useEffect, useState } from "react";

import {
  ChevronDown,
  ChevronUp,
  Trash2,
  X,
} from "lucide-react";

import { parseEpub } from "@/lib/readEpubParser";
import { commitBook } from "@/lib/readCommit";
import OpdsBrowser from "./OpdsBrowser";

import {
  addSource,
  guessSourceName,
  loadSources,
  removeSource,
  touchSource,
  type ReadSource,
} from "@/lib/readSources";

import {
  buildProxyUrl,
  hasReadProxy,
  loadReadProxy,
  saveReadProxy,
} from "@/lib/readProxy";

import RssSubscriptions from "./RssSubscriptions";

type ReadBookPickerProps = {
  onClose: () => void;
  onAdded: (id: string) => void;
};

type Tab = "file" | "url" | "rss" | "opds";

const MAX_FETCH_BYTES = 20 * 1024 * 1024;

function IOSFileLabel({
  label,
  fileName,
  onChange,
}: {
  label: string;
  fileName: string | null;
  onChange: (f: File | null) => void;
}) {
  return (
    <label className="read-picker-file-label">
      <span>{fileName ? fileName : label}</span>
      <input
        type="file"
        accept=".txt,.epub,text/plain,application/epub+zip"
        className="ios-file-input"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onChange(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}

async function fetchTextSmart(
  url: string
): Promise<{ text: string; viaProxy: boolean }> {
  let lastErr: unknown = null;

  try {
    const res = await fetch(url, { redirect: "follow" });

    const lenHeader = res.headers.get("content-length");
    if (lenHeader) {
      const n = Number(lenHeader);
      if (Number.isFinite(n) && n > MAX_FETCH_BYTES) {
        throw new Error("文件太大（超过 20MB）");
      }
    }

    if (res.ok) {
      const text = await res.text();
      if (text && text.length >= 50) {
        return { text, viaProxy: false };
      }
      lastErr = new Error("内容为空或太短");
    } else {
      lastErr = new Error(`HTTP ${res.status}`);
    }
  } catch (e) {
    lastErr = e;
  }

  if (hasReadProxy()) {
    const proxyUrl = buildProxyUrl(url);
    const res = await fetch(proxyUrl, {
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(
        `代理返回 ${res.status}` +
          (res.status === 403 ? "（token 不对？）" : "")
      );
    }
    const text = await res.text();
    if (!text || text.length < 50) {
      throw new Error("代理返回内容为空或太短");
    }
    return { text, viaProxy: true };
  }

  if (lastErr instanceof Error) {
    throw new Error(
      `${lastErr.message}（未配置代理，无法绕过 CORS）`
    );
  }
  throw new Error("无法获取内容");
}

export default function ReadBookPicker({
  onClose,
  onAdded,
}: ReadBookPickerProps) {
  const [tab, setTab] = useState<Tab>("file");
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [err, setErr] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [fileTitle, setFileTitle] = useState("");
  const [fileAuthor, setFileAuthor] = useState("");

  const [url, setUrl] = useState("");
  const [urlTitle, setUrlTitle] = useState("");
  const [urlAuthor, setUrlAuthor] = useState("");
  const [saveAsSource, setSaveAsSource] = useState(true);

  const [sources, setSources] = useState<ReadSource[]>([]);

  const [showProxyPanel, setShowProxyPanel] =
    useState(false);
  const [proxyUrl, setProxyUrl] = useState("");
  const [proxyToken, setProxyToken] = useState("");
  const [proxyHasConfig, setProxyHasConfig] =
    useState(false);

  useEffect(() => {
    setSources(loadSources());
    const cfg = loadReadProxy();
    setProxyUrl(cfg.url);
    setProxyToken(cfg.token);
    setProxyHasConfig(
      !!cfg.url.trim() && !!cfg.token.trim()
    );
  }, []);

  function resetErr() {
    setErr("");
  }

  function handleSaveProxy() {
    const ok = saveReadProxy({
      url: proxyUrl.trim(),
      token: proxyToken.trim(),
    });
    if (ok) {
      setProxyHasConfig(
        !!proxyUrl.trim() && !!proxyToken.trim()
      );
      alert("代理设置已保存");
    } else {
      alert("保存失败");
    }
  }

  async function handleAddFile() {
    if (busy) return;
    resetErr();

    if (!file) {
      setErr("请先选择一个文件");
      return;
    }

    const lower = file.name.toLowerCase();
    const isEpub = lower.endsWith(".epub");
    const isTxt = lower.endsWith(".txt");

    if (!isEpub && !isTxt) {
      setErr("只支持 .txt 或 .epub 文件");
      return;
    }

    setBusy(true);
    setBusyLabel(isEpub ? "解析 EPUB…" : "读取 TXT…");

    try {
      if (isEpub) {
        const parsed = await parseEpub(file);
        const finalTitle =
          fileTitle.trim() ||
          parsed.title ||
          file.name.replace(/\.epub$/i, "");
        const finalAuthor =
          fileAuthor.trim() || parsed.author;
        const id = await commitBook(parsed.text, {
          title: finalTitle,
          author: finalAuthor,
          source: "import",
        });
        onAdded(id);
      } else {
        const text = await file.text();
        if (!text || text.length < 50) {
          throw new Error("文件内容为空或太短");
        }
        const fallbackTitle =
          file.name.replace(/\.txt$/i, "") || "未命名";
        const id = await commitBook(text, {
          title: fileTitle || fallbackTitle,
          author: fileAuthor,
          source: "import",
        });
        onAdded(id);
      }
    } catch (e) {
      console.error("[Read] 导入失败:", e);
      setErr(e instanceof Error ? e.message : "导入失败");
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  }

  async function handleAddUrl() {
    if (busy) return;
    resetErr();

    const target = url.trim();
    if (!target) {
      setErr("请填写链接");
      return;
    }

    setBusy(true);
    setBusyLabel("下载中…");

    try {
      const { text } = await fetchTextSmart(target);
      const title = urlTitle.trim() || "未命名";

      const id = await commitBook(text, {
        title,
        author: urlAuthor,
        source: "url",
        sourceUrl: target,
      });

      if (saveAsSource) {
        const name =
          urlTitle.trim() || guessSourceName(target);
        addSource(name, target);
      }

      onAdded(id);
    } catch (e) {
      console.error("[Read] 拉取失败:", e);
      const msg =
        e instanceof Error ? e.message : "拉取失败";
      setErr(
        `${msg}\n\n` +
          "排查建议：\n" +
          "· 如果直连失败且没配置代理 → 展开下方「高级 · 代理设置」\n" +
          "· 如果是 RSS / 连载 → 用「订阅」tab"
      );
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  }

  function handlePickSource(s: ReadSource) {
    setUrl(s.url);
    touchSource(s.id);
    setSources(loadSources());
    resetErr();
  }

  function handleDeleteSource(s: ReadSource) {
    if (!window.confirm(`删除书源「${s.name}」？`)) {
      return;
    }
    removeSource(s.id);
    setSources(loadSources());
  }

  /* =========================================================
     Render
     ========================================================= */

  const isWideTab = tab === "rss" || tab === "opds";
  const showFooter = tab === "file" || tab === "url";

  return (
    <div
      className="read-picker-backdrop"
      onClick={onClose}
    >
      <div
        className={
          isWideTab
            ? "read-picker read-picker-wide"
            : "read-picker"
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div className="read-picker-header">
          <h2>添加书籍</h2>
          <button onClick={onClose} aria-label="关闭">
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        <div className="read-picker-tabs">
          <button
            className={tab === "file" ? "active" : ""}
            onClick={() => {
              setTab("file");
              resetErr();
            }}
          >
            本地导入
          </button>
          <button
            className={tab === "url" ? "active" : ""}
            onClick={() => {
              setTab("url");
              resetErr();
            }}
          >
            链接
          </button>
          <button
            className={tab === "rss" ? "active" : ""}
            onClick={() => {
              setTab("rss");
              resetErr();
            }}
          >
            订阅
          </button>
          <button
            className={tab === "opds" ? "active" : ""}
            onClick={() => {
              setTab("opds");
              resetErr();
            }}
          >
            书库
          </button>
        </div>

        {tab === "file" && (
          <div className="read-picker-body">
            <div className="read-picker-field">
              <span>TXT / EPUB 文件</span>
              <IOSFileLabel
                label="选择文件"
                fileName={file?.name ?? null}
                onChange={setFile}
              />
            </div>
            <label className="read-picker-field">
              <span>书名（可选）</span>
              <input
                type="text"
                value={fileTitle}
                onChange={(e) =>
                  setFileTitle(e.target.value)
                }
                placeholder="留空则自动识别"
                maxLength={80}
              />
            </label>
            <label className="read-picker-field">
              <span>作者（可选）</span>
              <input
                type="text"
                value={fileAuthor}
                onChange={(e) =>
                  setFileAuthor(e.target.value)
                }
                placeholder="留空为佚名"
                maxLength={60}
              />
            </label>
            <p className="read-picker-hint">
              EPUB 会自动读取书名和作者。
              TXT 会按章节标记（第X章 / Chapter X）自动分章。
            </p>
          </div>
        )}

        {tab === "url" && (
          <div className="read-picker-body">
            <label className="read-picker-field">
              <span>直链 URL</span>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/book.txt"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>
            <label className="read-picker-field">
              <span>书名（可选）</span>
              <input
                type="text"
                value={urlTitle}
                onChange={(e) =>
                  setUrlTitle(e.target.value)
                }
                maxLength={80}
              />
            </label>
            <label className="read-picker-field">
              <span>作者（可选）</span>
              <input
                type="text"
                value={urlAuthor}
                onChange={(e) =>
                  setUrlAuthor(e.target.value)
                }
                maxLength={60}
              />
            </label>

            <label className="read-picker-checkbox-row">
              <input
                type="checkbox"
                checked={saveAsSource}
                onChange={(e) =>
                  setSaveAsSource(e.target.checked)
                }
              />
              <span>收藏为我的书源</span>
            </label>

            <div className="read-picker-advanced">
              <button
                className="read-picker-advanced-toggle"
                onClick={() =>
                  setShowProxyPanel((v) => !v)
                }
                type="button"
              >
                <span>
                  高级 · 代理设置
                  {proxyHasConfig && (
                    <span className="read-picker-proxy-badge">
                      已配置
                    </span>
                  )}
                </span>
                {showProxyPanel ? (
                  <ChevronUp size={14} strokeWidth={2.4} />
                ) : (
                  <ChevronDown
                    size={14}
                    strokeWidth={2.4}
                  />
                )}
              </button>

              {showProxyPanel && (
                <div className="read-picker-proxy-panel">
                  <label className="read-picker-field">
                    <span>Worker 地址</span>
                    <input
                      type="text"
                      value={proxyUrl}
                      onChange={(e) =>
                        setProxyUrl(e.target.value)
                      }
                      placeholder="https://xxx.workers.dev"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </label>
                  <label className="read-picker-field">
                    <span>Token</span>
                    <input
                      type="text"
                      value={proxyToken}
                      onChange={(e) =>
                        setProxyToken(e.target.value)
                      }
                      placeholder="PROXY_TOKEN 的值"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </label>
                  <button
                    className="read-picker-proxy-save"
                    onClick={handleSaveProxy}
                    type="button"
                  >
                    保存
                  </button>
                </div>
              )}
            </div>

            {sources.length > 0 && (
              <div className="read-picker-sources">
                <div className="read-picker-sources-title">
                  我的书源
                </div>
                <div className="read-picker-sources-list">
                  {sources.map((s) => (
                    <div
                      key={s.id}
                      className="read-picker-source-item"
                    >
                      <button
                        className="read-picker-source-main"
                        onClick={() => handlePickSource(s)}
                      >
                        <span className="read-picker-source-name">
                          {s.name}
                        </span>
                        <span className="read-picker-source-url">
                          {s.url}
                        </span>
                      </button>
                      <button
                        className="read-picker-source-delete"
                        onClick={() =>
                          handleDeleteSource(s)
                        }
                        aria-label="删除书源"
                      >
                        <Trash2
                          size={13}
                          strokeWidth={2.2}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "rss" && (
          <div className="read-picker-source-panel">
            <RssSubscriptions onAdded={onAdded} />
          </div>
        )}

        {tab === "opds" && (
          <div className="read-picker-source-panel">
            <OpdsBrowser onAdded={onAdded} />
          </div>
        )}

        {err && showFooter && (
          <div className="read-picker-error">{err}</div>
        )}

        {showFooter && (
          <div className="read-picker-footer">
            <button
              className="read-picker-btn ghost"
              onClick={onClose}
              disabled={busy}
            >
              取消
            </button>
            <button
              className="read-picker-btn"
              onClick={() => {
                if (tab === "file") void handleAddFile();
                else void handleAddUrl();
              }}
              disabled={busy}
            >
              {busy ? busyLabel || "处理中…" : "添加"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}