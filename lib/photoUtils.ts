export type CompressOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeBytes?: number;
};

export type CompressResult = {
  blob: Blob;
  type: string;
  ext: string;
  originalSize: number;
  compressedSize: number;
};

const DEFAULTS: Required<CompressOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  maxSizeBytes: 1.5 * 1024 * 1024,
};

export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<CompressResult> {
  const opts = { ...DEFAULTS, ...options };
  const originalSize = file.size;

  /* GIF 保持原样（动图压缩会破坏动画） */
  if (file.type === "image/gif") {
    return {
      blob: file,
      type: file.type,
      ext: "gif",
      originalSize,
      compressedSize: originalSize,
    };
  }

  let bitmap: HTMLImageElement | null = null;

  try {
    bitmap = await loadImage(file);

    const srcW = bitmap.naturalWidth || bitmap.width;
    const srcH = bitmap.naturalHeight || bitmap.height;

    /* 如果尺寸和体积都不超标，直接返回原文件 */
    const isJpegLike =
      file.type === "image/jpeg" ||
      file.type === "image/webp";

    if (
      isJpegLike &&
      file.size <= opts.maxSizeBytes &&
      srcW <= opts.maxWidth &&
      srcH <= opts.maxHeight
    ) {
      return {
        blob: file,
        type: file.type,
        ext: getExtension(file.name, file.type),
        originalSize,
        compressedSize: originalSize,
      };
    }

    const { width, height } = scaleSize(
      srcW,
      srcH,
      opts.maxWidth,
      opts.maxHeight
    );

    const outputType = pickOutputType(file.type);

    let quality = opts.quality;
    let blob = await canvasToBlob(
      bitmap,
      width,
      height,
      outputType,
      quality
    );

    /* 循环降质量直到满足大小 */
    let attempts = 0;
    while (
      blob.size > opts.maxSizeBytes &&
      quality > 0.4 &&
      attempts < 6 &&
      outputType !== "image/png"
    ) {
      quality -= 0.1;
      attempts += 1;

      const next = await canvasToBlob(
        bitmap,
        width,
        height,
        outputType,
        quality
      );

      if (next.size >= blob.size) break;
      blob = next;
    }

    return {
      blob,
      type: outputType,
      ext: outputType === "image/webp"
        ? "webp"
        : outputType === "image/png"
          ? "png"
          : "jpg",
      originalSize,
      compressedSize: blob.size,
    };
  } catch (e) {
    console.error("压缩失败，使用原文件:", e);

    return {
      blob: file,
      type: file.type || "image/jpeg",
      ext: getExtension(file.name, file.type),
      originalSize,
      compressedSize: originalSize,
    };
  } finally {
    /* 释放图片元素 */
    if (bitmap) {
      bitmap.src = "";
    }
  }
}

/* ---------- 内部工具 ---------- */

function getExtension(name: string, type: string): string {
  const idx = name.lastIndexOf(".");
  if (idx > -1) {
    return name.slice(idx + 1).toLowerCase();
  }
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
}

function pickOutputType(inputType: string): string {
  if (inputType === "image/png") return "image/webp";
  if (inputType === "image/webp") return "image/webp";
  return "image/jpeg";
}

function scaleSize(
  w: number,
  h: number,
  maxW: number,
  maxH: number
): { width: number; height: number } {
  let width = w;
  let height = h;

  if (width > maxW) {
    height = (height * maxW) / width;
    width = maxW;
  }

  if (height > maxH) {
    width = (width * maxH) / height;
    height = maxH;
  }

  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片加载失败"));
    };

    img.src = url;
  });
}

function canvasToBlob(
  img: HTMLImageElement,
  width: number,
  height: number,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas 初始化失败"));
      return;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("图片压缩失败"));
      },
      type,
      quality
    );
  });
}