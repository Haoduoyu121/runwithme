"use client";

import { useEffect, useRef, useState } from "react";

import {
  formatTimeAgo,
  getAuthorDisplay,
  type ICityPost,
  type ICityAuthor,
} from "@/data/icity";

import { useICity } from "@/lib/ICityContext";
import { useCollection } from "@/lib/CollectionContext";

import NewPostModal from "@/components/apps/icity/NewPostModal";
import PostDetail from "@/components/apps/icity/PostDetail";
import ProfilePage from "@/components/apps/icity/ProfilePage";
import ImageLightbox from "@/components/apps/icity/ImageLightbox";
import ICityNotificationPanel from "@/components/apps/icity/ICityNotificationPanel";

type ICityAppProps = {
  onBack: () => void;
};

type Tab = "world" | "mine";

/* -------------------------------------------------------
   SVG 图标
   ------------------------------------------------------- */

function WorldIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.8 3.8 5.9 3.8 9s-1.3 6.2-3.8 9" />
      <path d="M12 3c-2.5 2.8-3.8 5.9-3.8 9s1.3 6.2 3.8 9" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function PostIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 20l4-1L20 7a2 2 0 0 0-3-3L5 16l-1 4z" />
      <path d="M15 6l3 3" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 4v5h-5" />
    </svg>
  );
}

/* =========================================================
   主组件
   ========================================================= */

export default function ICityApp({
  onBack,
}: ICityAppProps) {
  const {
    posts,
    comments,
    profiles,
    avatarUrls,
    postImageUrls,
    toggleLike,
    addUserPost,
    forceInteraction,
    unreadCount,
  } = useICity();
 
  const { tryAutoCollect } = useCollection();
  const [tab, setTab] = useState<Tab>("world");
  const [showNewPost, setShowNewPost] = useState(false);
  const [showDockMenu, setShowDockMenu] = useState(false);
  const [detailPostId, setDetailPostId] = useState<
    string | null
  >(null);
  const [profileAuthor, setProfileAuthor] =
    useState<ICityAuthor | null>(null);

  const [lightbox, setLightbox] = useState<{
    images: string[];
    index: number;
  } | null>(null);

  const [showNotifications, setShowNotifications] =
  useState(false);

  const dockMenuRef = useRef<HTMLDivElement | null>(null);

  const myProfile = profiles.Yui;
  const myAvatarUrl = avatarUrls.Yui;
  const myInitial =
    myProfile.name.trim().charAt(0) || "Y";

  /* 点击外部关闭 dock 菜单 */
  useEffect(() => {
    if (!showDockMenu) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        dockMenuRef.current &&
        !dockMenuRef.current.contains(target)
      ) {
        setShowDockMenu(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, [showDockMenu]);

  function commentCountForPost(postId: string) {
    return comments.filter((c) => c.postId === postId)
      .length;
  }

  function openPost(postId: string) {
    setDetailPostId(postId);
  }

  function openProfile(author: ICityAuthor) {
    setProfileAuthor(author);
  }

  function openLightbox(images: string[], index: number) {
    setLightbox({ images, index });
  }

  function handleDockPlus() {
    setShowDockMenu((prev) => !prev);
  }

  function handleMenuPost() {
    setShowDockMenu(false);
    setShowNewPost(true);
  }

  function handleMenuRefresh() {
    setShowDockMenu(false);
    forceInteraction();
  }

  const headerTitle =
    tab === "world" ? "World" : myProfile.name;

  return (
    <main className="app-screen icity-app">
      <header className="icity-header">
        <button
          className="icity-back"
          onClick={onBack}
          aria-label="返回"
        >
          ‹
        </button>

        <div className="icity-title">
          <div className="icity-title-main">
            {headerTitle}
          </div>
          <div className="icity-title-sub">
            a little private world
          </div>
        </div>

                <button
          className={`icity-notif-btn${
            showNotifications ? " is-active" : ""
          }`}
          onClick={() => setShowNotifications(true)}
          aria-label="互动消息"
          title=""
        >
          <span className="icity-notif-bell">♡</span>
          <span
            className={`icity-notif-badge${
              unreadCount === 0 ? " is-zero" : ""
            }`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        </button>

                <button
          className={`icity-my-avatar ${
            myAvatarUrl ? " has-image" : ""
          }`}
          onClick={() => setTab("mine")}
          aria-label="我的主页"
        >
          {myAvatarUrl ? (
            <img
              src={myAvatarUrl}
              alt={myProfile.name}
            />
          ) : (
            <span>{myInitial}</span>
          )}
        </button>
      </header>

      {tab === "world" && (
        <div className="icity-feed">
          {posts.length === 0 ? (
            <div className="icity-feed-empty">
              <div className="icity-feed-empty-icon">
                ✦
              </div>
              <div className="icity-feed-empty-title">
                还没有动态
              </div>
              <div className="icity-feed-empty-desc">
                发布第一条动态，或者等他们自己冒出来。
              </div>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                profiles={profiles}
                avatarUrls={avatarUrls}
                postImageUrls={postImageUrls}
                commentCount={commentCountForPost(
                  post.id
                )}
                onOpen={() => openPost(post.id)}
                onToggleLike={() =>
                  toggleLike(post.id, true)
                }
                onOpenProfile={openProfile}
                onOpenImage={openLightbox}
              />
            ))
          )}
        </div>
      )}

      {tab === "mine" && (
        <ProfilePage
          author="Yui"
          embedded
          onClose={() => setTab("world")}
          onOpenPost={(id) => setDetailPostId(id)}
        />
      )}

      <nav className="icity-dock">
        <div className="icity-dock-inner">
          <button
            className={`icity-dock-tab${
              tab === "world" ? " active" : ""
            }`}
            onClick={() => setTab("world")}
            aria-label="World"
          >
            <WorldIcon />
            <span>World</span>
          </button>

          <div
            className="icity-dock-post-slot"
            ref={dockMenuRef}
          >
            {/* 悬浮菜单 */}
            {showDockMenu && (
              <div className="icity-dock-menu">
                <button
                  className="icity-dock-menu-item"
                  onClick={handleMenuPost}
                >
                  <span className="icity-dock-menu-icon">
                    <PostIcon />
                  </span>
                  <span className="icity-dock-menu-label">
                    发帖
                  </span>
                </button>

                <button
                  className="icity-dock-menu-item"
                  onClick={handleMenuRefresh}
                >
                  <span className="icity-dock-menu-icon">
                    <RefreshIcon />
                  </span>
                  <span className="icity-dock-menu-label">
                    刷新
                  </span>
                </button>
              </div>
            )}

            <button
              className={`icity-dock-post${
                showDockMenu ? " active" : ""
              }`}
              onClick={handleDockPlus}
              aria-label="更多"
            >
              <PlusIcon />
            </button>
          </div>

          <button
            className={`icity-dock-tab${
              tab === "mine" ? " active" : ""
            }`}
            onClick={() => setTab("mine")}
            aria-label="Mine"
          >
            <UserIcon />
            <span>Mine</span>
          </button>
        </div>
      </nav>

      {showNewPost && (
        <NewPostModal
          onClose={() => setShowNewPost(false)}
          onSubmit={(text, files) => {
            addUserPost(text, files);

            /* 系统自动收藏判定（1%~5%） */
            tryAutoCollect({
              source: "icity",
              content:
                text.trim() ||
                `（发了 ${files.length} 张照片）`,
              sender: "You",
              originalAt: Date.now(),
              meta: { imageCount: files.length },
            });
          }}
        />
      )}

      {detailPostId && (
        <PostDetail
          postId={detailPostId}
          onClose={() => setDetailPostId(null)}
          onOpenProfile={openProfile}
        />
      )}

      {profileAuthor && (
        <ProfilePage
          author={profileAuthor}
          onClose={() => setProfileAuthor(null)}
          onOpenPost={(id) => {
            setProfileAuthor(null);
            setDetailPostId(id);
          }}
        />
      )}

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
      
      {showNotifications && (
        <ICityNotificationPanel
          onClose={() => setShowNotifications(false)}
          onOpenPost={(postId) => {
            setDetailPostId(postId);
          }}
        />
      )}
    </main>
  );
}

/* =========================================================
   PostCard
   ========================================================= */

function PostCard({
  post,
  profiles,
  avatarUrls,
  postImageUrls,
  commentCount,
  onOpen,
  onToggleLike,
  onOpenProfile,
  onOpenImage,
}: {
  post: ICityPost;
  profiles: {
    Yui: { name: string; handle: string };
    Levi: { name: string; handle: string };
    Erwin: { name: string; handle: string };
  };
  avatarUrls: Record<ICityAuthor, string | null>;
  postImageUrls: Record<string, string>;
  commentCount: number;
  onOpen: () => void;
  onToggleLike: () => void;
  onOpenProfile: (a: ICityAuthor) => void;
  onOpenImage: (images: string[], index: number) => void;
}) {
  const author = getAuthorDisplay(post.author, profiles);
  const likedByUser = post.likes.includes("Yui");
  const avatarUrl = avatarUrls[post.author];

  const imageUrls = (post.imageIds ?? [])
    .map((id) => postImageUrls[id])
    .filter((u): u is string => !!u);

  return (
    <article className="icity-post">
      <div className="icity-post-head">
        <button
          className={`icity-avatar ${author.colorClass}${
            avatarUrl ? " icity-avatar-has-image" : ""
          }`}
          onClick={() => onOpenProfile(post.author)}
          aria-label="查看主页"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={author.name} />
          ) : (
            author.initial
          )}
        </button>

        <div className="icity-post-meta">
          <strong>{author.name}</strong>
          <span>{formatTimeAgo(post.timestamp)}</span>
        </div>
      </div>

      {post.text && (
        <div
          className="icity-post-text"
          onClick={onOpen}
        >
          {post.text}
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
              onClick={(e) => {
                e.stopPropagation();
                onOpenImage(imageUrls, i);
              }}
            />
          ))}
        </div>
      )}

      <div className="icity-post-actions">
        <button
          className={`icity-action like${
            likedByUser ? " active" : ""
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike();
          }}
        >
          {likedByUser ? "♥" : "♡"}{" "}
          {post.likes.length}
        </button>

        <button
          className="icity-action"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          💬 {commentCount}
        </button>
      </div>

      {post.likes.length > 0 && (
        <div className="icity-post-likers">
          {post.likes
            .map((a) => profiles[a]?.name || a)
            .join(" · ")}
        </div>
      )}
    </article>
  );
}