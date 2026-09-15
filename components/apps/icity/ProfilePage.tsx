"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  formatTimeAgo,
  type ICityAuthor,
} from "@/data/icity";

import { useICity } from "@/lib/ICityContext";

type ProfilePageProps = {
  author: ICityAuthor;
  onClose: () => void;
  onOpenPost: (postId: string) => void;
  /**
   * 内嵌模式：
   * - 不显示自己的 header / 返回按钮
   * - 不作为全屏 overlay，而是和底栏共存的普通内容区
   * - 用于底栏 Mine tab
   */
  embedded?: boolean;
};

export default function ProfilePage({
  author,
  onClose,
  onOpenPost,
  embedded = false,
}: ProfilePageProps) {
  const {
    posts,
    comments,
    profiles,
    avatarUrls,
    backgroundUrls,
    updateProfile,
    setAvatarFile,
    removeAvatar,
    setBackgroundFile,
    removeBackground,
    toggleLike,
  } = useICity();

  const profile = profiles[author];
  const avatarUrl = avatarUrls[author];
  const bgUrl = backgroundUrls[author];

  const [editingName, setEditingName] = useState(false);
  const [editingHandle, setEditingHandle] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.name);
  const [handleDraft, setHandleDraft] = useState(
    profile.handle
  );

  const bgInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNameDraft(profile.name);
  }, [profile.name]);

  useEffect(() => {
    setHandleDraft(profile.handle);
  }, [profile.handle]);

  const authorPosts = posts
    .filter((p) => p.author === author)
    .sort((a, b) => b.timestamp - a.timestamp);

  const commentCount = comments.filter(
    (c) => c.author === author
  ).length;

  const initial =
    profile.name.trim().charAt(0).toUpperCase() ||
    author.charAt(0);

  const colorClass =
    author === "Yui"
      ? "icity-avatar-you"
      : author === "Levi"
        ? "icity-avatar-levi"
        : "icity-avatar-erwin";

  function saveName() {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== profile.name) {
      updateProfile(author, { name: trimmed });
    } else {
      setNameDraft(profile.name);
    }
    setEditingName(false);
  }

  function saveHandle() {
    const trimmed = handleDraft
      .trim()
      .replace(/^@/, "");
    if (trimmed !== profile.handle) {
      updateProfile(author, { handle: trimmed });
    } else {
      setHandleDraft(profile.handle);
    }
    setEditingHandle(false);
  }

  return (
    <div
      className={`icity-profile${
        embedded ? " is-embedded" : ""
      }`}
    >
      {!embedded && (
        <header className="icity-profile-header">
          <button
            className="icity-detail-back"
            onClick={onClose}
            aria-label="返回"
          >
            ‹
          </button>

          <div className="icity-detail-title">
            {profile.name}
          </div>

          <div className="icity-detail-placeholder" />
        </header>
      )}

      <div className="icity-profile-scroll">
        {/* 背景 + 头像 */}
        <div
          className="icity-profile-cover"
          style={
            bgUrl
              ? { backgroundImage: `url("${bgUrl}")` }
              : undefined
          }
        >
          <button
            className="icity-profile-cover-edit"
            onClick={() => bgInputRef.current?.click()}
            aria-label="更换背景"
          >
            📷
          </button>

          {bgUrl && (
            <button
              className="icity-profile-cover-remove"
              onClick={() => void removeBackground(author)}
              aria-label="移除背景"
            >
              ×
            </button>
          )}

          <input
            ref={bgInputRef}
            type="file"
            accept="image/*"
            style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none", overflow: "hidden" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file)
                void setBackgroundFile(author, file);
              e.target.value = "";
            }}
          />
        </div>

        {/* 头像：独立于 cover，位于底部边缘 */}
        <div className="icity-profile-avatar-wrap">
          <button
            className={`icity-profile-avatar ${colorClass}${
              avatarUrl
                ? " icity-profile-avatar-custom"
                : ""
            }`}
            onClick={() => avatarInputRef.current?.click()}
            aria-label="更换头像"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={profile.name} />
            ) : (
              initial
            )}

            <span className="icity-profile-avatar-edit">
              📷
            </span>
          </button>

          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
           style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none", overflow: "hidden" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void setAvatarFile(author, file);
              e.target.value = "";
            }}
          />
        </div>

        {/* 名字 + ID */}
        <div className="icity-profile-meta">
          {editingName ? (
            <input
              className="icity-profile-meta-input"
              value={nameDraft}
              maxLength={20}
              autoFocus
              onChange={(e) =>
                setNameDraft(e.target.value)
              }
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveName();
                  (
                    e.target as HTMLInputElement
                  ).blur();
                }
                if (e.key === "Escape") {
                  setNameDraft(profile.name);
                  setEditingName(false);
                }
              }}
            />
          ) : (
            <button
              className="icity-profile-meta-name"
              onClick={() => setEditingName(true)}
            >
              {profile.name}
            </button>
          )}

          {editingHandle ? (
            <input
              className="icity-profile-meta-input icity-profile-meta-input-small"
              value={handleDraft}
              maxLength={20}
              autoFocus
              onChange={(e) =>
                setHandleDraft(e.target.value)
              }
              onBlur={saveHandle}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveHandle();
                  (
                    e.target as HTMLInputElement
                  ).blur();
                }
                if (e.key === "Escape") {
                  setHandleDraft(profile.handle);
                  setEditingHandle(false);
                }
              }}
            />
          ) : (
            <button
              className="icity-profile-meta-handle"
              onClick={() => setEditingHandle(true)}
            >
              @{profile.handle || "user"}
            </button>
          )}

          {avatarUrl && (
            <button
              className="icity-profile-avatar-remove-inline"
              onClick={() => void removeAvatar(author)}
            >
              移除头像
            </button>
          )}
        </div>

        {/* 统计 */}
        <div className="icity-profile-stats">
          <div className="icity-profile-stat">
            <strong>{authorPosts.length}</strong>
            <span>Posts</span>
          </div>

          <div className="icity-profile-stat">
            <strong>{commentCount}</strong>
            <span>Comments</span>
          </div>
        </div>

        {/* 帖子列表 */}
        <div className="icity-profile-list">
          {authorPosts.length === 0 ? (
            <div className="icity-profile-empty">
              还没有动态
            </div>
          ) : (
            authorPosts.map((post) => {
              const likedByUser =
                post.likes.includes("Yui");
              const cc = comments.filter(
                (c) => c.postId === post.id
              ).length;

              return (
                <article
                  key={post.id}
                  className="icity-post"
                >
                  <div
                    className="icity-post-text"
                    onClick={() => onOpenPost(post.id)}
                  >
                    {post.text}
                  </div>

                  <div className="icity-post-actions">
                    <button
                      className={`icity-action like${
                        likedByUser ? " active" : ""
                      }`}
                      onClick={() =>
                        toggleLike(post.id, true)
                      }
                    >
                      {likedByUser ? "♥" : "♡"}{" "}
                      {post.likes.length}
                    </button>

                    <button
                      className="icity-action"
                      onClick={() =>
                        onOpenPost(post.id)
                      }
                    >
                      💬 {cc}
                    </button>

                    <span className="icity-post-time-inline">
                      {formatTimeAgo(post.timestamp)}
                    </span>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}