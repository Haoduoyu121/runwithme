"use client";

import { useEffect, useState } from "react";

import {
  BookOpen,
  ChevronLeft,
  Download,
  Folder,
  Loader2,
  Plus,
  Settings,
  Trash2,
  X,
} from "lucide-react";

import {
  addOpdsSource,
  buildOpdsAuthHeader,
  guessOpdsName,
  loadOpdsSources,
  removeOpdsSource,
  touchOpdsSource,
  type OpdsSource,
} from "@/lib/opdsSources";

import {
  parseOpds,
  type OpdsEntry,
} from "@/lib/opdsParser";

import { fetchBlob, fetchHtml } from "@/lib/proxyFetch";
import { commitBook } from "@/lib/readCommit";
import { parseEpub } from "@/lib/readEpubParser";
import { saveReadCover } from "@/lib/readCoverFiles";
import {
  upsertBook,
  loadLibrary,
} from "@/lib/readLibraryStorage";

type OpdsBrowserProps = {
  onAdded: (bookId: string) => void;
};

type Crumb = {
  title: string;
  url: string;
};

export default function OpdsBrowser({
  onAdded,
}: OpdsBrowserProps) {
  const [sources, setSources] = useState<OpdsSource[]>([]);
  const [activeSourceId, setActiveSourceId] = useState<
    string | null
  >(null);

  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  const [entries, setEntries] = useState<OpdsEntry[]>([]);
  const [currentTitle, setCurrentTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [showAddSource, setShowAddSource] = useState(false);
  const [addName, setAddName] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [addErr, setAddErr] = useState("");
  const [addUsername, setAddUsername] = useState("");
  const [addPassword, setAddPassword] = useState("");

  const [busyEntryId, setBusyEntryId] = useState<
    string | null
  >(null);
  const [busyLabel, setBusyLabel] = useState("");

  useEffect(() => {
    const list = loadOpdsSources();
    setSources(list);
    if (list.length > 0) {
      setActiveSourceId(list[0].id);
    }
  }, []);

  /* ---------- 加载某个 OPDS URL ---------- */

  async function loadUrl(
    url: string,
    crumbTitle: string,
    crumbUrl: string,
    pushCrumb: boolean
  ) {
    setLoading(true);
    setErr("");

    try {
      const activeSrc = sources.find(
  (s) => s.id === activeSourceId
);
      const headers = buildOpdsAuthHeader(activeSrc);
      const fetched = await fetchHtml(url, { headers });
      const feed = parseOpds(
        fetched.html,
        fetched.finalUrl || url
      );

      setEntries(feed.entries);
      setCurrentTitle(feed.title);

      if (pushCrumb) {
        setCrumbs((prev) => [
          ...prev,
          { title: crumbTitle, url: crumbUrl },
        ]);
      } else {
        setCrumbs([{ title: crumbTitle, url: crumbUrl }]);
      }
    } catch (e) {
      console.error("[OPDS] 加载失败:", e);
      setErr(
        e instanceof Error ? e.message : "加载失败"
      );
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  function selectSource(s: OpdsSource) {
    setActiveSourceId(s.id);
    touchOpdsSource(s.id);
    setSources(loadOpdsSources());
    void loadUrl(s.url, s.name, s.url, false);
  }

  function handleNav(entry: OpdsEntry) {
    if (!entry.navUrl) return;
    void loadUrl(
      entry.navUrl,
      entry.title,
      entry.navUrl,
      true
    );
  }

  function handleCrumbBack(index: number) {
    const crumb = crumbs[index];
    if (!crumb) return;
    setCrumbs(crumbs.slice(0, index + 1));
    void loadUrl(crumb.url, crumb.title, crumb.url, false);
    /* pushCrumb=false 会重置 crumbs，所以手动设一下 */
    setCrumbs(crumbs.slice(0, index + 1));
  }

  /* ---------- 下载一本书 ---------- */

  async function handleDownload(entry: OpdsEntry) {
    if (busyEntryId) return;
    if (!entry.downloadUrl) return;

    if (
      !window.confirm(
        `下载《${entry.title}》到书架？\n\n` +
          `格式：${
            entry.downloadMime || "未知"
          }`
      )
    ) {
      return;
    }

    setBusyEntryId(entry.id);
    setBusyLabel("下载中…");

    try {
      const activeSrc = sources.find(
  (s) => s.id === activeSourceId
);
      const headers = buildOpdsAuthHeader(activeSrc);
      const fetched = await fetchBlob(entry.downloadUrl, {
  headers,
});

      /* 判断文件类型 */
      const mime = (
        entry.downloadMime ||
        fetched.blob.type ||
        ""
      ).toLowerCase();
      const isEpub =
        mime.includes("epub") ||
        entry.downloadUrl.toLowerCase().endsWith(".epub");
      const isTxt =
        mime.includes("text/plain") ||
        entry.downloadUrl.toLowerCase().endsWith(".txt");

      setBusyLabel("解析中…");

      let text = "";
      if (isEpub) {
        const file = new File(
          [fetched.blob],
          `${entry.title}.epub`,
          { type: "application/epub+zip" }
        );
        const parsed = await parseEpub(file);
        text = parsed.text;
      } else if (isTxt) {
        text = await fetched.blob.text();
      } else {
        throw new Error(
          `暂不支持这种格式：${mime || "未知"}`
        );
      }

      if (!text || text.length < 50) {
        throw new Error("下载内容为空");
      }

      setBusyLabel("加入书架…");

      const bookId = await commitBook(text, {
        title: entry.title,
        author: entry.author,
        source: "opds",
        sourceUrl: entry.downloadUrl,
      });

      /* 下载封面（可选） */
      if (entry.coverUrl) {
        try {
          const coverFetched = await fetchBlob(
           entry.coverUrl,
             { headers }
        );
          const coverId = `read-cover-${bookId}`;
          await saveReadCover(
            coverId,
            coverFetched.blob
          );
          const book = loadLibrary().find(
            (b) => b.id === bookId
          );
          if (book) {
            upsertBook({
              ...book,
              coverImageId: coverId,
            });
          }
        } catch (e) {
          console.warn("[OPDS] 封面下载失败:", e);
        }
      }

      onAdded(bookId);
    } catch (e) {
      console.error("[OPDS] 下载失败:", e);
      alert(
        "下载失败：\n" +
          (e instanceof Error ? e.message : "未知错误")
      );
    } finally {
      setBusyEntryId(null);
      setBusyLabel("");
    }
  }

  /* ---------- 添加 / 删除来源 ---------- */

  function handleAddSource() {
    setAddErr("");
    const n = addName.trim();
    const u = addUrl.trim();

    if (!u) {
      setAddErr("请填写 OPDS 地址");
      return;
    }

    const name = n || guessOpdsName(u);
    const source = addOpdsSource(
  name,
  u,
  addUsername,
  addPassword
);
    if (!source) {
      setAddErr("添加失败");
      return;
    }

    setSources(loadOpdsSources());
    setShowAddSource(false);
    setAddName("");
    setAddUrl("");
    setAddUsername("");
    setAddPassword("");
    selectSource(source);
  }

  function handleDeleteSource(s: OpdsSource) {
    if (
      !window.confirm(
        `删除书库「${s.name}」？\n\n书本身不受影响。`
      )
    ) {
      return;
    }
    const next = removeOpdsSource(s.id);
    setSources(next);
    if (activeSourceId === s.id) {
      setActiveSourceId(next[0]?.id ?? null);
      setEntries([]);
      setCrumbs([]);
      setCurrentTitle("");
    }
  }

  /* ---------- render ---------- */

  const activeSource = sources.find(
    (s) => s.id === activeSourceId
  );

  return (
    <div className="opds-root">
      <div className="opds-topbar">
        <div className="opds-topbar-title">书库</div>
        <button
          className="opds-topbar-action"
          onClick={() => setShowAddSource(true)}
        >
          <Plus size={13} strokeWidth={2.6} />
          添加书库
        </button>
      </div>

      {sources.length === 0 ? (
        <div className="opds-empty">
          <div className="opds-empty-title">
            还没有书库
          </div>
          <div className="opds-empty-desc">
            OPDS 是电子书目录标准。添加一个书库
            地址即可浏览。
          </div>
          <button
            className="opds-empty-btn"
            onClick={() => setShowAddSource(true)}
          >
            <Plus size={14} strokeWidth={2.6} />
            添加书库
          </button>
        </div>
      ) : (
        <>
          {/* 书库 chips */}
          <div className="opds-source-chips">
            {sources.map((s) => (
              <div
                key={s.id}
                className={
                  activeSourceId === s.id
                    ? "opds-source-chip-wrap active"
                    : "opds-source-chip-wrap"
                }
              >
                <button
                  className="opds-source-chip"
                  onClick={() => selectSource(s)}
                >
                  {s.name}
                </button>
                <button
                  className="opds-source-chip-delete"
                  onClick={() => handleDeleteSource(s)}
                  aria-label="删除"
                >
                  <X size={11} strokeWidth={2.6} />
                </button>
              </div>
            ))}
          </div>

          {/* 面包屑 */}
          {crumbs.length > 0 && (
            <div className="opds-crumbs">
              {crumbs.map((c, i) => (
                <span key={i} className="opds-crumb">
                  {i > 0 && (
                    <span className="opds-crumb-sep">
                      /
                    </span>
                  )}
                  {i === crumbs.length - 1 ? (
                    <span className="opds-crumb-current">
                      {c.title}
                    </span>
                  ) : (
                    <button
                      className="opds-crumb-btn"
                      onClick={() => handleCrumbBack(i)}
                    >
                      {c.title}
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* 内容区 */}
          <div className="opds-content">
            {loading && entries.length === 0 && (
              <div className="opds-loading">
                <Loader2
                  size={20}
                  strokeWidth={2.2}
                  className="opds-spin"
                />
                加载中…
              </div>
            )}

            {err && (
              <div className="opds-error">{err}</div>
            )}

            {!loading && !err && entries.length === 0 && (
              <div className="opds-empty-inline">
                这个目录是空的
              </div>
            )}

            {entries.map((e) => (
              <div key={e.id} className="opds-entry">
                <button
                  className="opds-entry-main"
                  onClick={() => {
                    if (e.kind === "nav") {
                      handleNav(e);
                    } else {
                      void handleDownload(e);
                    }
                  }}
                  disabled={busyEntryId !== null}
                >
                  <div className="opds-entry-icon">
                    {e.kind === "nav" ? (
                      <Folder
                        size={20}
                        strokeWidth={1.8}
                      />
                    ) : (
                      <BookOpen
                        size={20}
                        strokeWidth={1.8}
                      />
                    )}
                  </div>
                  <div className="opds-entry-body">
                    <div className="opds-entry-title">
                      {e.title}
                    </div>
                    {e.author && (
                      <div className="opds-entry-author">
                        {e.author}
                      </div>
                    )}
                    {e.summary && (
                      <div className="opds-entry-summary">
                        {e.summary}
                      </div>
                    )}
                  </div>
                </button>

                {e.kind === "book" && (
                  <button
                    className="opds-entry-action"
                    onClick={() => handleDownload(e)}
                    disabled={busyEntryId !== null}
                    aria-label="下载"
                  >
                    {busyEntryId === e.id ? (
                      <Loader2
                        size={15}
                        strokeWidth={2.4}
                        className="opds-spin"
                      />
                    ) : (
                      <Download
                        size={15}
                        strokeWidth={2.4}
                      />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* 添加书库弹窗 */}
      {showAddSource && (
        <div
          className="opds-add-backdrop"
          onClick={() => setShowAddSource(false)}
        >
          <div
            className="opds-add"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="opds-add-header">
              <h3>添加书库</h3>
              <button
                onClick={() => setShowAddSource(false)}
                aria-label="关闭"
              >
                <X size={15} strokeWidth={2.2} />
              </button>
            </div>

            <div className="opds-add-body">
              <label className="opds-add-field">
                <span>名称（可选）</span>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) =>
                    setAddName(e.target.value)
                  }
                  placeholder="留空则用域名"
                  maxLength={40}
                />
              </label>
              <label className="opds-add-field">
                <span>OPDS 地址</span>
                <input
                  type="text"
                  value={addUrl}
                  onChange={(e) =>
                    setAddUrl(e.target.value)
                  }
                  placeholder="https://example.com/opds"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </label>

                            <label className="opds-add-field">
                <span>用户名（可选）</span>
                <input
                  type="text"
                  value={addUsername}
                  onChange={(e) =>
                    setAddUsername(e.target.value)
                  }
                  placeholder="Calibre-Web 账号"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </label>

              <label className="opds-add-field">
                <span>密码（可选）</span>
                <input
                  type="password"
                  value={addPassword}
                  onChange={(e) =>
                    setAddPassword(e.target.value)
                  }
                  placeholder="Calibre-Web 密码"
                  autoComplete="new-password"
                />
              </label>

              <p className="opds-add-hint">
                常见 OPDS：很多 Calibre-Web 自建书库
                自带 OPDS。拉取会走你配置的代理。
              </p>

              {addErr && (
                <div className="opds-add-error">
                  {addErr}
                </div>
              )}
            </div>

            <div className="opds-add-footer">
              <button
                className="opds-btn ghost"
                onClick={() => setShowAddSource(false)}
              >
                取消
              </button>
              <button
                className="opds-btn"
                onClick={handleAddSource}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 下载进度浮层 */}
      {busyEntryId && (
        <div className="opds-progress">
          <Loader2
            size={15}
            strokeWidth={2.4}
            className="opds-spin"
          />
          <span>{busyLabel}</span>
        </div>
      )}
    </div>
  );
}