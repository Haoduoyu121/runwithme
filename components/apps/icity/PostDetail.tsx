"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  formatFullTime,
  getAuthorDisplay,
  type ICityPost,
  type ICityComment,
} from "@/data/icity";

import { useICity } from "@/lib/ICityContext";

import ImageLightbox from "@/components/apps/icity/ImageLightbox";

type PostDetailProps = {
  postId: string;
  onClose: () => void;
  onOpenProfile: (
    author: "Yui" | "Levi" | "Erwin"
  ) => void;
};

export default function PostDetail({
  postId,
  onClose,
  onOpenProfile,
}: PostDetailProps) {
  const {
    posts,
    profiles,
    avatarUrls,
    postImageUrls,
    getCommentsForPost,
    addUserComment,
    deleteComment,
    toggleLike,
    deletePost,
  } = useICity();

  const post = posts.find((p) => p.id === postId);
  const comments = getCommentsForPost(postId);

  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] =
    useState<ICityComment | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<
    number | null
  >(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [comments.length]);

  if (!post) return null;

  const safePost: ICityPost = post;
  const author = getAuthorDisplay(
    safePost.author,
    profiles
  );
  const likedByUser = safePost.likes.includes("Yui");
  const postAvatarUrl = avatarUrls[safePost.author];

  const imageUrls = (safePost.imageIds ?? [])
    .map((id) => postImageUrls[id])
    .filter((u): u is string => !!u);

  /* 顶层评论 vs 回复 */
  const topLevelComments = comments.filter(
    (c) => !c.replyToCommentId
  );

  function getReplies(parentId: string) {
    return comments.filter(
      (c) => c.replyToCommentId === parentId
    );
  }

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed) return;

    addUserComment(safePost.id, trimmed, replyTo?.id);
    setInput("");
    setReplyTo(null);
  }

  function handleDeletePost() {
    if (
      !window.confirm(
        "删除这条动态？所有评论也会一起删除。"
      )
    )
      return;

    deletePost(safePost.id);
    onClose();
  }

  function handleDeleteComment(commentId: string) {
    if (!window.confirm("删除这条评论？")) return;
    deleteComment(commentId);
  }

  /* -----------------------------------------------
     渲染单条评论（顶层）
     ----------------------------------------------- */

  function renderTopComment(c: ICityComment) {
    const cAuthor = getAuthorDisplay(c.author, profiles);
    const cAvatarUrl = avatarUrls[c.author];
    const replies = getReplies(c.id);

    return (
      <div key={c.id} className="icity-comment-thread">
        <div className="icity-comment">
          <button
            className={`icity-avatar icity-avatar-small ${cAuthor.colorClass}${
              cAvatarUrl
                ? " icity-avatar-has-image"
                : ""
            }`}
            onClick={() => onOpenProfile(c.author)}
          >
            {cAvatarUrl ? (
              <img src={cAvatarUrl} alt={cAuthor.name} />
            ) : (
              cAuthor.initial
            )}
          </button>

          <div className="icity-comment-body">
            <div className="icity-comment-head">
              <strong>{cAuthor.name}</strong>
              <span>{formatFullTime(c.timestamp)}</span>
            </div>

            <div className="icity-comment-text">{c.text}</div>

            <button
              className="icity-comment-reply-btn"
              onClick={() => setReplyTo(c)}
            >
              回复
            </button>
          </div>

          <button
            className="icity-comment-delete"
            onClick={() => handleDeleteComment(c.id)}
            aria-label="删除评论"
          >
            ×
          </button>
        </div>

        {replies.length > 0 && (
          <div className="icity-comment-replies">
            {replies.map((r) => {
              const rAuthor = getAuthorDisplay(
                r.author,
                profiles
              );
              const rAvatarUrl = avatarUrls[r.author];

              return (
                <div
                  key={r.id}
                  className="icity-reply-row"
                >
                  <button
                    className={`icity-avatar icity-avatar-tiny ${rAuthor.colorClass}${
                      rAvatarUrl
                        ? " icity-avatar-has-image"
                        : ""
                    }`}
                    onClick={() => onOpenProfile(r.author)}
                  >
                    {rAvatarUrl ? (
                      <img
                        src={rAvatarUrl}
                        alt={rAuthor.name}
                      />
                    ) : (
                      rAuthor.initial
                    )}
                  </button>

                  <div className="icity-reply-bubble">
                    <div className="icity-reply-head">
                      <strong>{rAuthor.name}</strong>
                      <span>
                        {formatFullTime(r.timestamp)}
                      </span>
                    </div>

                    <div className="icity-reply-text">
                      {r.text}
                    </div>

                    <button
                      className="icity-reply-delete"
                      onClick={() =>
                        handleDeleteComment(r.id)
                      }
                      aria-label="删除回复"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="icity-detail">
      <header className="icity-detail-header">
        <button
          className="icity-detail-back"
          onClick={onClose}
          aria-label="返回"
        >
          ‹
        </button>

        <div className="icity-detail-title">Post</div>

        <button
          className="icity-detail-delete"
          onClick={handleDeletePost}
          aria-label="删除"
        >
          🗑
        </button>
      </header>

      <div className="icity-detail-body">
        <article className="icity-detail-post">
          <div className="icity-detail-post-head">
            <button
              className={`icity-avatar ${author.colorClass}${
                postAvatarUrl
                  ? " icity-avatar-has-image"
                  : ""
              }`}
              onClick={() =>
                onOpenProfile(safePost.author)
              }
              aria-label="查看主页"
            >
              {postAvatarUrl ? (
                <img
                  src={postAvatarUrl}
                  alt={author.name}
                />
              ) : (
                author.initial
              )}
            </button>

            <div className="icity-detail-post-meta">
              <strong>{author.name}</strong>
              <span>
                {formatFullTime(safePost.timestamp)}
              </span>
            </div>
          </div>

          {safePost.text && (
            <div className="icity-detail-post-text">
              {safePost.text}
            </div>
          )}

          {imageUrls.length > 0 && (
            <div
              className={`icity-post-images count-${imageUrls.length}`}
            >
              {imageUrls.map((url, i) => (
                <img
                  key={url}
                  className="icity-post-image"
                  src={url}
                  alt={`配图 ${i + 1}`}
                  onClick={() => setLightboxIndex(i)}
                />
              ))}
            </div>
          )}

          <div className="icity-detail-post-actions">
            <button
              className={`icity-action like${
                likedByUser ? " active" : ""
              }`}
              onClick={() =>
                toggleLike(safePost.id, true)
              }
            >
              {likedByUser ? "♥" : "♡"}{" "}
              {safePost.likes.length}
            </button>

            <div className="icity-action">
              💬 {comments.length}
            </div>
          </div>

          {safePost.likes.length > 0 && (
            <div className="icity-detail-likers">
              {safePost.likes
                .map(
                  (a) => profiles[a]?.name || a
                )
                .join(" · ")}
            </div>
          )}
        </article>

        <div className="icity-detail-comments">
          {comments.length === 0 ? (
            <div className="icity-detail-empty">
              还没有评论
            </div>
          ) : (
            topLevelComments.map(renderTopComment)
          )}

          <div ref={scrollRef} />
        </div>
      </div>

      <div className="icity-detail-composer">
        {replyTo && (
          <div className="icity-detail-reply-bar">
            <span>
              回复{" "}
              {
                getAuthorDisplay(
                  replyTo.author,
                  profiles
                ).name
              }
            </span>
            <button onClick={() => setReplyTo(null)}>
              ×
            </button>
          </div>
        )}

        <div className="icity-detail-composer-row">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Write a comment..."
          />

          <button
            className="icity-detail-send"
            onClick={handleSend}
            disabled={!input.trim()}
            aria-label="发送"
          >
            ↑
          </button>
        </div>
      </div>

      {lightboxIndex !== null && imageUrls.length > 0 && (
        <ImageLightbox
          images={imageUrls}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}