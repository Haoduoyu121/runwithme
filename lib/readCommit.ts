import {
  createReadBookId,
  pickCoverColor,
  type ReadBook,
} from "@/data/read";

import { saveBookText } from "@/lib/readBookFiles";
import { upsertBook } from "@/lib/readLibraryStorage";

export type CommitBookMeta = {
  title: string;
  author: string;
  source: ReadBook["source"];
  sourceUrl?: string;
  coverImageId?: string;
};

/** 把一份文本落成一本新书，返回 book id */
export async function commitBook(
  text: string,
  meta: CommitBookMeta
): Promise<string> {
  const id = createReadBookId();
  const title = meta.title.trim() || "未命名";

  await saveBookText(id, text);

  const book: ReadBook = {
    id,
    title,
    author: meta.author.trim(),
    source: meta.source,
    sourceUrl: meta.sourceUrl,
    addedAt: Date.now(),
    charCount: text.length,
    coverColor: pickCoverColor(title),
    coverImageId: meta.coverImageId,
    progress: {
      chapterIndex: 0,
      offset: 0,
      updatedAt: Date.now(),
    },
  };

  upsertBook(book);
  return id;
}