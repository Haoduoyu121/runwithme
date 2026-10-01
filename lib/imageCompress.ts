/**
 * 压缩图片：长边 ≤ maxSize，输出 JPEG，质量 quality
 * - iOS 兼容：createImageBitmap + canvas.toBlob
 * - 失败时原样返回
 */
export async function compressImage(
  file: File | Blob,
  maxSize = 1280,
  quality = 0.82
): Promise<Blob> {
  if (typeof window === "undefined") return file as Blob;

  try {
    const bitmap = await createImageBitmap(file);
    const { width: origW, height: origH } = bitmap;

    const scale = Math.min(
      1,
      maxSize / Math.max(origW, origH)
    );
    const targetW = Math.max(1, Math.round(origW * scale));
    const targetH = Math.max(1, Math.round(origH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file as Blob;

    ctx.drawImage(bitmap, 0, 0, targetW, targetH);

    return new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob ?? (file as Blob)),
        "image/jpeg",
        quality
      );
    });
  } catch (e) {
    console.error("压缩失败，使用原图:", e);
    return file as Blob;
  }
}