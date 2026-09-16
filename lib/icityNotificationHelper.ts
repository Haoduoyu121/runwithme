import type {
  ICityNotification,
  ICityPost,
  ICityComment,
} from "@/data/icity";

/* 从当前帖子和评论里推断所有"和我相关"的互动事件 */
export function collectInteractions(
  posts: ICityPost[],
  comments: ICityComment[]
): ICityNotification[] {
  const result: ICityNotification[] = [];

  const myPosts = new Set<string>();
  const likedPosts = new Set<string>();
  const commentedPosts = new Set<string>();
  const myCommentIds = new Set<string>();
  const postById = new Map<string, ICityPost>();

  for (const p of posts) {
    postById.set(p.id, p);
    if (p.author === "Yui") myPosts.add(p.id);
    if (p.likes.includes("Yui")) likedPosts.add(p.id);
  }

  for (const c of comments) {
    if (c.author === "Yui") {
      commentedPosts.add(c.postId);
      myCommentIds.add(c.id);
    }
  }

  /* ---------- 点赞 ---------- */

  for (const post of posts) {
    const relevant =
      myPosts.has(post.id) ||
      likedPosts.has(post.id) ||
      commentedPosts.has(post.id);
    if (!relevant) continue;

    const preview =
      post.text.length > 30
        ? post.text.slice(0, 30) + "…"
        : post.text;

    for (const who of post.likes) {
      if (who !== "Levi" && who !== "Erwin") continue;

      result.push({
        id: `like:${who}:${post.id}`,
        type: "like",
        from: who,
        postId: post.id,
        postPreview: preview || "(图片)",
        createdAt: Date.now(),
        read: false,
      });
    }
  }

  /* ---------- 评论 ---------- */

  for (const c of comments) {
    if (c.author !== "Levi" && c.author !== "Erwin")
      continue;

    const targetPost = postById.get(c.postId);
    if (!targetPost) continue;

    const relevantPost =
      myPosts.has(c.postId) ||
      likedPosts.has(c.postId) ||
      commentedPosts.has(c.postId);

    const repliesToMe =
      c.replyToCommentId &&
      myCommentIds.has(c.replyToCommentId);

    if (!relevantPost && !repliesToMe) continue;

    const postPreview =
      targetPost.text.length > 30
        ? targetPost.text.slice(0, 30) + "…"
        : targetPost.text;

    result.push({
      id: `comment:${c.id}`,
      type: "comment",
      from: c.author,
      postId: c.postId,
      postPreview: postPreview || "(图片)",
      commentText: c.text,
      createdAt: Date.now(),
      read: false,
    });
  }

  return result;
}