/**
 * 流式思维链过滤器
 * 检测 <thinking> / <cot> / <reasoning> / <scratchpad> 等标签，实时隐藏
 */

const HIDDEN_TAGS = [
  "thinking",
  "cot",
  "reasoning",
  "scratchpad",
  "thinking_process",
];

export class ThinkingFilter {
  private buf = "";
  private mode: "normal" | "hidden" = "normal";
  private closeTag = "";

  feed(chunk: string): string {
    this.buf += chunk;
    let out = "";

    while (this.buf.length > 0) {
      if (this.mode === "normal") {
        /* 找最近的开标签 */
        let best = -1;
        let bestTag = "";
        const lower = this.buf.toLowerCase();
        for (const tag of HIDDEN_TAGS) {
          const i = lower.indexOf(`<${tag}>`);
          if (i >= 0 && (best < 0 || i < best)) {
            best = i;
            bestTag = tag;
          }
        }

        if (best >= 0) {
          out += this.buf.slice(0, best);
          this.buf = this.buf.slice(best + bestTag.length + 2);
          this.mode = "hidden";
          this.closeTag = `</${bestTag}>`;
        } else {
          /* 检查尾部是否是部分开标签 */
          const lastLt = lower.lastIndexOf("<");
          let partial = false;
          if (lastLt >= 0) {
            const tail = lower.slice(lastLt);
            for (const tag of HIDDEN_TAGS) {
              if (`<${tag}>`.startsWith(tail)) {
                partial = true;
                break;
              }
            }
          }
          if (partial) {
            out += this.buf.slice(0, lastLt);
            this.buf = this.buf.slice(lastLt);
            return out;
          }
          out += this.buf;
          this.buf = "";
        }
      } else {
        /* hidden 模式，找闭标签 */
        const i = this.buf
          .toLowerCase()
          .indexOf(this.closeTag.toLowerCase());
        if (i >= 0) {
          this.buf = this.buf.slice(
            i + this.closeTag.length
          );
          this.mode = "normal";
          this.closeTag = "";
        } else {
          /* 保留尾部可能是部分闭标签的字符 */
          const keep = Math.min(
            this.buf.length,
            this.closeTag.length - 1
          );
          if (this.buf.length > keep) {
            this.buf = this.buf.slice(
              this.buf.length - keep
            );
          }
          return out;
        }
      }
    }
    return out;
  }

  flush(): string {
    if (this.mode === "hidden") {
      this.buf = "";
      this.mode = "normal";
      this.closeTag = "";
      return "";
    }
    const r = this.buf;
    this.buf = "";
    return r;
  }
}

/** 一次性处理（用于完整文本） */
export function stripThinking(text: string): string {
  let out = text;
  for (const tag of HIDDEN_TAGS) {
    const re = new RegExp(
      `<${tag}>[\\s\\S]*?<\\/${tag}>`,
      "gi"
    );
    out = out.replace(re, "");
    /* 未闭合的也删掉 */
    const openRe = new RegExp(`<${tag}>[\\s\\S]*$`, "i");
    out = out.replace(openRe, "");
  }
  /* HTML 注释 */
  out = out.replace(/<!--[\s\S]*?-->/g, "");
  return out.trim();
}