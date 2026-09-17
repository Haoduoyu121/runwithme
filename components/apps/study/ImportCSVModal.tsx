"use client";

import { useMemo, useRef, useState } from "react";

import type { Word, WordBook } from "@/data/study";
import {
  parseStudyCsv,
  type CsvWordRow,
} from "@/lib/studyCsv";

type ImportTarget =
  | { type: "existing"; bookId: string }
  | { type: "new"; name: string };

type Props = {
  books: WordBook[];
  words: Word[];
  onImport: (
    target: ImportTarget,
    rows: CsvWordRow[]
  ) => {
    added: number;
    skipped: number;
    bookName: string;
  };
  onClose: () => void;
};

type Stage = "pick" | "preview" | "done";

export default function ImportCSVModal({
  books,
  words,
  onImport,
  onClose,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stage, setStage] = useState<Stage>("pick");

  /* 目标 */
  const [targetMode, setTargetMode] = useState<
    "existing" | "new"
  >(books.length > 0 ? "existing" : "new");
  const [selectedBookId, setSelectedBookId] = useState<
    string
  >(books[0]?.id ?? "");
  const [newBookName, setNewBookName] = useState("");

  /* 解析结果 */
  const [rows, setRows] = useState<CsvWordRow[]>([]);
  const [parseSkipped, setParseSkipped] = useState(0);
  const [fileName, setFileName] = useState("");

  /* 结果 */
  const [result, setResult] = useState<{
    added: number;
    skipped: number;
    bookName: string;
  } | null>(null);

  /* 当前目标是否合法 */
  const canContinue = useMemo(() => {
    if (targetMode === "existing") {
      return !!selectedBookId;
    }
    return newBookName.trim().length > 0;
  }, [targetMode, selectedBookId, newBookName]);

  /* ---------- 选文件 ---------- */

  async function handleFileChange(
    files: FileList | null
  ) {
    if (!files || files.length === 0) return;
    const file = files[0];

    try {
      const text = await file.text();
      const parsed = parseStudyCsv(text);

      if (parsed.rows.length === 0) {
        alert(
          "文件里没有有效数据。格式：单词,释义,例句（例句可选）"
        );
        return;
      }

      setRows(parsed.rows);
      setParseSkipped(parsed.skipped);
      setFileName(file.name);
      setStage("preview");
    } catch (e) {
      console.error("读取 CSV 失败:", e);
      alert("读取文件失败。");
    }
  }

  /* ---------- 提交 ---------- */

  function handleImport() {
    if (!canContinue || rows.length === 0) return;

    const target: ImportTarget =
      targetMode === "existing"
        ? { type: "existing", bookId: selectedBookId }
        : { type: "new", name: newBookName.trim() };

    const res = onImport(target, rows);
    setResult(res);
    setStage("done");
  }

  /* ---------- 关闭（done 阶段再点关闭就真的关） ---------- */

  function handleClose() {
    onClose();
  }

  return (
    <div
      className="study-modal-backdrop"
      onClick={handleClose}
    >
      <div
        className="study-modal study-import-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="study-modal-header">
          <h2>导入 CSV</h2>
          <button
            className="study-modal-close"
            onClick={handleClose}
          >
            ×
          </button>
        </div>

        {/* ---------- 阶段 1：选目标 + 选文件 ---------- */}
        {stage === "pick" && (
          <>
            <div className="study-import-section">
              <div className="study-import-label">
                导入到
              </div>

              <div className="study-import-target">
                {books.length > 0 && (
                  <label className="study-import-radio">
                    <input
                      type="radio"
                      checked={targetMode === "existing"}
                      onChange={() =>
                        setTargetMode("existing")
                      }
                    />
                    <span>已有词书</span>
                  </label>
                )}

                <label className="study-import-radio">
                  <input
                    type="radio"
                    checked={targetMode === "new"}
                    onChange={() => setTargetMode("new")}
                  />
                  <span>新建词书</span>
                </label>
              </div>

              {targetMode === "existing" &&
                books.length > 0 && (
                  <select
                    className="study-import-select"
                    value={selectedBookId}
                    onChange={(e) =>
                      setSelectedBookId(e.target.value)
                    }
                  >
                    {books.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}

              {targetMode === "new" && (
                <input
                  type="text"
                  className="study-import-input"
                  value={newBookName}
                  onChange={(e) =>
                    setNewBookName(e.target.value)
                  }
                  placeholder="词书名称…"
                  maxLength={40}
                  autoFocus
                />
              )}
            </div>

            <div className="study-import-section">
              <div className="study-import-label">
                文件
              </div>

              <button
                type="button"
                className="study-import-file-btn"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                disabled={!canContinue}
              >
                {canContinue
                  ? "选择 CSV 文件…"
                  : "先填写目标词书"}
              </button>

              <div className="study-import-hint">
                CSV 格式：<code>单词,释义,例句</code>
                （例句可选）。第一行可以是表头，会自动跳过。
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  opacity: 0,
                  overflow: "hidden",
                  pointerEvents: "none",
                }}
                onChange={(e) => {
                  void handleFileChange(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="study-modal-footer">
              <button
                className="study-btn ghost"
                onClick={handleClose}
              >
                取消
              </button>
            </div>
          </>
        )}

        {/* ---------- 阶段 2：预览 ---------- */}
        {stage === "preview" && (
          <>
            <div className="study-import-summary">
              <strong>{fileName}</strong>
              <span>
                解析到 {rows.length} 条
                {parseSkipped > 0
                  ? `，跳过 ${parseSkipped} 条`
                  : ""}
              </span>
            </div>

            <div className="study-import-preview">
              <div className="study-import-preview-label">
                前 5 条
              </div>
              <ul className="study-import-preview-list">
                {rows.slice(0, 5).map((r, i) => (
                  <li key={i}>
                    <strong>{r.text}</strong>
                    <span>{r.meaning}</span>
                  </li>
                ))}
                {rows.length > 5 && (
                  <li className="study-import-preview-more">
                    … 还有 {rows.length - 5} 条
                  </li>
                )}
              </ul>
            </div>

            <div className="study-modal-footer">
              <button
                className="study-btn ghost"
                onClick={() => {
                  setRows([]);
                  setFileName("");
                  setParseSkipped(0);
                  setStage("pick");
                }}
              >
                重选
              </button>
              <button
                className="study-btn"
                onClick={handleImport}
              >
                导入 {rows.length} 条
              </button>
            </div>
          </>
        )}

        {/* ---------- 阶段 3：结果 ---------- */}
        {stage === "done" && result && (
          <>
            <div className="study-import-result">
              <div className="study-import-result-icon">
                ✓
              </div>
              <div className="study-import-result-title">
                导入完成
              </div>
              <div className="study-import-result-detail">
                <div>
                  词书：<strong>{result.bookName}</strong>
                </div>
                <div>
                  成功添加：
                  <strong>{result.added}</strong> 条
                </div>
                {result.skipped > 0 && (
                  <div className="study-import-result-skip">
                    {result.skipped} 条已存在，跳过
                  </div>
                )}
              </div>
            </div>

            <div className="study-modal-footer">
              <button
                className="study-btn"
                onClick={handleClose}
              >
                完成
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}