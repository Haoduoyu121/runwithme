"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Camera,
  Settings,
  Trash2,
  X,
} from "lucide-react";

import {
  formatTimeAgo,
  type ICityAuthor,
} from "@/data/icity";

import { useICity } from "@/lib/ICityContext";

import BioPoolEditor from "@/components/apps/icity/BioPoolEditor";

type ProfilePageProps = {
  author: ICityAuthor;
  onClose: () => void;
  onOpenPost: (postId: string) => void;
  embedded?: boolean;
};

type ActionMenu = "cover" | "avatar" | null;

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

  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState(profile.bio);

  const [showBioPool, setShowBioPool] = useState(false);

  const [actionMenu, setActionMenu] =
    useState<ActionMenu>(null);

  const bgInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNameDraft(profile.name);
  }, [profile.name]);

  useEffect(() => {
    setHandleDraft(profile.handle);
  }, [profile.handle]);

  useEffect(() => {
    setBioDraft(profile.bio);
  }, [profile.bio]);

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

  const isMine = author === "Yui";

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

  function saveBio() {
    const trimmed = bioDraft.trim();
    if (trimmed !== profile.bio) {
      updateProfile(author, { bio: trimmed });
    } else {
      setBioDraft(profile.bio);
    }
    setEditingBio(false);
  }

  function handleCoverClick() {
    if (!isMine) return;
    if (bgUrl) {
      setActionMenu("cover");
    } else {
      bgInputRef.current?.click();
    }
  }

  function handleAvatarClick() {
    if (!isMine) return;
    if (avatarUrl) {
      setActionMenu("avatar");
    } else {
      avatarInputRef.current?.click();
    }
  }

  function pickCover() {
    setActionMenu(null);
    bgInputRef.current?.click();
  }

  function pickAvatar() {
    setActionMenu(null);
    avatarInputRef.current?.click();
  }

  function clearCover() {
    setActionMenu(null);
    void removeBackground(author);
  }

  function clearAvatar() {
    setActionMenu(null);
    void removeAvatar(author);
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

          {isMine ? (
            <button
              className="icity-profile-settings-btn"
              onClick={() => setShowBioPool(true)}
              aria-label="简介卡池"
            >
              <Settings size={18} strokeWidth={2} />
            </button>
          ) : (
            <div className="icity-detail-placeholder" />
          )}
        </header>
      )}

      <div className="icity-profile-scroll">
        {/* 背景 */}
        <button
          type="button"
          className="icity-profile-cover"
          style={
            bgUrl
              ? { backgroundImage: `url("${bgUrl}")` }
              : undefined
          }
          onClick={handleCoverClick}
          aria-label={
            isMine
              ? bgUrl
                ? "更换或清空背景"
                : "上传背景"
              : "背景"
          }
          disabled={!isMine}
        />

        {/* 头像 */}
        <div className="icity-profile-avatar-wrap">
          <button
            type="button"
            className={`icity-profile-avatar ${colorClass}${
              avatarUrl
                ? " icity-profile-avatar-custom"
                : ""
            }`}
            onClick={handleAvatarClick}
            aria-label={
              isMine
                ? avatarUrl
                  ? "更换或清空头像"
                  : "上传头像"
                : "头像"
            }
            disabled={!isMine}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={profile.name} />
            ) : (
              initial
            )}
          </button>
        </div>

        {/* 隐藏 file input */}
        <input
          ref={bgInputRef}
          type="file"
          accept="*/*"
          className="ios-file-input-detached"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void setBackgroundFile(author, file);
            e.target.value = "";
          }}
        />
        <input
          ref={avatarInputRef}
          type="file"
          accept="*/*"
          className="ios-file-input-detached"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void setAvatarFile(author, file);
            e.target.value = "";
          }}
        />

        {/* 名字 + ID + 简介 */}
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
              onClick={() => isMine && setEditingName(true)}
              disabled={!isMine}
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
              onClick={() =>
                isMine && setEditingHandle(true)
              }
              disabled={!isMine}
            >
              @{profile.handle || "user"}
            </button>
          )}

          {/* 简介 */}
          {editingBio ? (
            <textarea
              className="icity-profile-bio-input"
              value={bioDraft}
              placeholder="写一句关于自己的话…"
              maxLength={80}
              rows={2}
              autoFocus
              onChange={(e) =>
                setBioDraft(e.target.value)
              }
              onBlur={saveBio}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  saveBio();
                  (
                    e.target as HTMLTextAreaElement
                  ).blur();
                }
                if (e.key === "Escape") {
                  setBioDraft(profile.bio);
                  setEditingBio(false);
                }
              }}
            />
          ) : profile.bio ? (
            <button
              className="icity-profile-bio"
              onClick={() => isMine && setEditingBio(true)}
              disabled={!isMine}
            >
              {profile.bio}
            </button>
          ) : isMine ? (
            <button
              className="icity-profile-bio is-placeholder"
              onClick={() => setEditingBio(true)}
            >
              写一句关于自己的话…
            </button>
          ) : null}

          {/* ★ 简介卡池入口（仅自己） */}
          {isMine && (
            <button
              className="icity-profile-bio-manage"
              onClick={() => setShowBioPool(true)}
            >
              <Settings size={12} strokeWidth={2.2} />
              管理简介卡池
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

      {/* 头像/背景 操作菜单 */}
      {actionMenu && (
        <div
          className="icity-action-menu-backdrop"
          onClick={() => setActionMenu(null)}
        >
          <div
            className="icity-action-menu"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="icity-action-menu-title">
              {actionMenu === "cover"
                ? "背景图片"
                : "头像图片"}
            </div>

            <button
              onClick={
                actionMenu === "cover"
                  ? pickCover
                  : pickAvatar
              }
            >
              <Camera
                size={16}
                strokeWidth={2}
                style={{
                  display: "inline-block",
                  verticalAlign: "-2px",
                  marginRight: 8,
                }}
              />
              更换
            </button>

            <button
              className="danger"
              onClick={
                actionMenu === "cover"
                  ? clearCover
                  : clearAvatar
              }
            >
              <Trash2
                size={16}
                strokeWidth={2}
                style={{
                  display: "inline-block",
                  verticalAlign: "-2px",
                  marginRight: 8,
                }}
              />
              清空
            </button>

            <div className="icity-action-menu-divider" />

            <button
              className="cancel"
              onClick={() => setActionMenu(null)}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 简介卡池编辑器 */}
      {showBioPool && (
        <BioPoolEditor
          onClose={() => setShowBioPool(false)}
        />
      )}
    </div>
  );
}