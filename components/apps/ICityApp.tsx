"use client";

import { useEffect, useRef, useState } from "react";

import {
  Bell,
  ChevronLeft,
  Globe,
  Pencil,
  Plus,
  RefreshCw,
  UserRound,
} from "lucide-react";

import {
  formatTimeAgo,
  getAuthorDisplay,
  type ICityPost,
  type ICityAuthor,
  type ICityProfiles,
} from "@/data/icity";

import { useICity } from "@/lib/ICityContext";
import { useCollection } from "@/lib/CollectionContext";
import TextCard from "@/components/apps/photos/TextCard";
import { useCharacterAvatars } from "@/lib/useCharacterAvatars";

import NewPostModal from "@/components/apps/icity/NewPostModal";
import PostDetail from "@/components/apps/icity/PostDetail";
import ProfilePage from "@/components/apps/icity/ProfilePage";
import ImageLightbox from "@/components/apps/icity/ImageLightbox";
import ICityNotificationPanel from "@/components/apps/icity/ICityNotificationPanel";

type ICityAppProps = {
  onBack: () => void;
};

type Tab = "world" | "mine";

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
  const charAvatars = useCharacterAvatars();
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

  /* ★ 独立全屏层级打开时，隐藏 Dock */
  const detailOpen = detailPostId !== null;
  const standaloneProfileOpen = profileAuthor !== null;
  const lightboxOpen = lightbox !== null;
  const hideDock =
    detailOpen || standaloneProfileOpen || lightboxOpen;

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
          <ChevronLeft size={26} strokeWidth={2.4} />
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
        >
          <span className="icity-notif-bell">
            <Bell size={20} strokeWidth={1.9} />
          </span>
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
                <Globe size={40} strokeWidth={1.4} />
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
                charAvatars={charAvatars}
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

      {/* ★ 只在没有打开独立全屏层级时渲染 Dock */}
      {!hideDock && (
        <nav className="icity-dock">
          <div className="icity-dock-inner">
            <button
              className={`icity-dock-tab${
                tab === "world" ? " active" : ""
              }`}
              onClick={() => setTab("world")}
              aria-label="World"
            >
              <Globe size={22} strokeWidth={1.8} />
              <span>World</span>
            </button>

            <div
              className="icity-dock-post-slot"
              ref={dockMenuRef}
            >
              {showDockMenu && (
                <div className="icity-dock-menu">
                  <button
                    className="icity-dock-menu-item"
                    onClick={handleMenuPost}
                  >
                    <span className="icity-dock-menu-icon">
                      <Pencil
                        size={16}
                        strokeWidth={2}
                      />
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
                      <RefreshCw
                        size={16}
                        strokeWidth={2}
                      />
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
                <Plus size={24} strokeWidth={2.6} />
              </button>
            </div>

            <button
              className={`icity-dock-tab${
                tab === "mine" ? " active" : ""
              }`}
              onClick={() => setTab("mine")}
              aria-label="Mine"
            >
              <UserRound size={22} strokeWidth={1.8} />
              <span>Mine</span>
            </button>
          </div>
        </nav>
      )}

      {showNewPost && (
        <NewPostModal
          onClose={() => setShowNewPost(false)}
          onSubmit={(text, files) => {
            addUserPost(text, files);

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
  charAvatars,
}: {
  post: ICityPost;
  profiles: ICityProfiles; 
  avatarUrls: Record<ICityAuthor, string | null>;
  postImageUrls: Record<string, string>;
  commentCount: number;
  onOpen: () => void;
  onToggleLike: () => void;
  onOpenProfile: (a: ICityAuthor) => void;
  onOpenImage: (images: string[], index: number) => void;
  charAvatars: Record<string, string | null>;
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

      {post.textCardSnapshot ? (
        <div
          className="icity-textcard"
          onClick={onOpen}
        >
          <TextCard
            card={post.textCardSnapshot}
            variant="full"
            avatars={charAvatars}
          />
        </div>
      ) : post.text ? (
        <div
          className="icity-post-text"
          onClick={onOpen}
        >
          {post.text}
        </div>
      ) : null}

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