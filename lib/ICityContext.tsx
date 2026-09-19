"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  cards as defaultCards,
  type Character,
  type CharacterCard,
} from "@/data/cards";

import { loadCards } from "@/lib/storage";

import {
  loadPosts,
  savePosts,
  loadComments,
  saveComments,
  loadProfiles,
  saveProfiles,
} from "@/lib/icityStorage";

import {
  saveICityFile,
  getICityFile,
  deleteICityFile,
  avatarKey,
  backgroundKey,
  postImageKey,
} from "@/lib/icityFiles";

import {
  createPostId,
  createCommentId,
  DEFAULT_PROFILES,
  type ICityPost,
  type ICityComment,
  type ICityAuthor,
  type ICityProfile,
  type ICityProfiles,
  type ICityNotification,
} from "@/data/icity";

import {
  loadNotifications,
  saveNotifications,
  loadSeenIds,
  saveSeenIds,
} from "@/lib/icityNotificationStorage";

import { collectInteractions } from "@/lib/icityNotificationHelper";

/* ★ Bio 调度 */
import {
  loadBioCards,
  pickRandomBio,
} from "@/lib/icityBioStorage";
import {
  BIO_CHECK_INTERVAL_MS,
  shouldRefreshBio,
} from "@/lib/icityBioScheduler";

/* -------------------------------------------------------
   时间参数
   ------------------------------------------------------- */

const POST_MIN_DELAY = 15 * 60 * 1000;
const POST_MAX_DELAY = 5 * 60 * 60 * 1000;

const REACT_MIN_DELAY = 30 * 1000;
const REACT_MAX_DELAY = 10 * 60 * 1000;

const REACT_LIKE_CHANCE = 0.55;
const REACT_COMMENT_CHANCE = 0.4;

const REPLY_TRIGGER_CHANCE = 0.4;
const REPLY_AS_REPLY_CHANCE = 0.7;
const MAX_REPLY_DEPTH = 1;

type AvatarUrlMap = Record<ICityAuthor, string | null>;
type BgUrlMap = Record<ICityAuthor, string | null>;

type ICityContextValue = {
  posts: ICityPost[];
  comments: ICityComment[];
  profiles: ICityProfiles;
  avatarUrls: AvatarUrlMap;
  backgroundUrls: BgUrlMap;
  postImageUrls: Record<string, string>;

  updateProfile: (
    author: ICityAuthor,
    patch: Partial<ICityProfile>
  ) => void;

  setAvatarFile: (
    author: ICityAuthor,
    file: File
  ) => Promise<void>;
  removeAvatar: (author: ICityAuthor) => Promise<void>;

  setBackgroundFile: (
    author: ICityAuthor,
    file: File
  ) => Promise<void>;
  removeBackground: (
    author: ICityAuthor
  ) => Promise<void>;

  addUserPost: (text: string, files?: File[]) => void;
  deletePost: (postId: string) => void;
  toggleLike: (postId: string, asUser: boolean) => void;
  addUserComment: (
    postId: string,
    text: string,
    replyToCommentId?: string
  ) => void;
  deleteComment: (commentId: string) => void;
  getCommentsForPost: (postId: string) => ICityComment[];

  forceInteraction: () => void;

  notifications: ICityNotification[];
  unreadCount: number;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
};

const ICityContext =
  createContext<ICityContextValue | null>(null);

/* -------------------------------------------------------
   工具
   ------------------------------------------------------- */

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandomCharacter(): Character {
  return Math.random() < 0.5 ? "Levi" : "Erwin";
}

function pickPostCardCount(): number {
  const r = Math.random();
  if (r < 0.45) return randInt(2, 4);
  if (r < 0.75) return randInt(5, 8);
  if (r < 0.92) return randInt(9, 12);
  return randInt(13, 18);
}

function composePostText(
  cards: CharacterCard[],
  character: Character
): string | null {
  const pool = cards.filter(
    (c) =>
      c.enabled &&
      c.type === "text" &&
      (c.character === character ||
        c.character === "Shared")
  );
  if (pool.length === 0) return null;

  const count = pickPostCardCount();
  const parts: string[] = [];

  for (let i = 0; i < count; i++) {
    const card =
      pool[Math.floor(Math.random() * pool.length)];
    const t = card.text.trim();
    if (t) parts.push(t);
  }

  if (parts.length === 0) return null;
  return parts.join(" ");
}

function pickCommentText(
  cards: CharacterCard[],
  character: Character
): string | null {
  const pool = cards.filter(
    (c) =>
      c.enabled &&
      c.type === "text" &&
      (c.character === character ||
        c.character === "Shared")
  );
  if (pool.length === 0) return null;

  return pool[
    Math.floor(Math.random() * pool.length)
  ].text.trim();
}

/* ★ 校验名字：非空、长度 ≤ 20、至少含一个字母或数字 */
function isValidName(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const t = s.trim();
  if (!t || t.length > 20) return false;
  return /[\p{L}\p{N}]/u.test(t);
}

/* ★ 校验 handle：可以空，但非空时必须含字母或数字 */
function isValidHandle(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const t = s.trim().replace(/^@/, "");
  if (!t) return true; // 允许空
  if (t.length > 30) return false;
  return /[\p{L}\p{N}]/u.test(t);
}
/* 兼容旧数据：确保每个 profile 都有 bio / lastBioUpdate */
function normalizeProfiles(
  raw: ICityProfiles
): ICityProfiles {
  const next: ICityProfiles = { ...raw };
  for (const a of [
    "Yui",
    "Levi",
    "Erwin",
  ] as ICityAuthor[]) {
    const base = DEFAULT_PROFILES[a];
    const cur = raw[a];
    next[a] = {
      name: isValidName(cur?.name)
        ? cur.name.trim()
        : base.name,
      handle: isValidHandle(cur?.handle)
        ? cur.handle.trim().replace(/^@/, "")
        : base.handle,
      bio:
        typeof cur?.bio === "string"
          ? cur.bio
          : base.bio,
      lastBioUpdate:
        typeof cur?.lastBioUpdate === "number"
          ? cur.lastBioUpdate
          : base.lastBioUpdate,
    };
  }
  return next;
}

/* -------------------------------------------------------
   Provider
   ------------------------------------------------------- */

export function ICityProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [posts, setPosts] = useState<ICityPost[]>([]);
  const [comments, setComments] = useState<
    ICityComment[]
  >([]);
  const [profiles, setProfiles] = useState<ICityProfiles>(
    DEFAULT_PROFILES
  );

  const [avatarUrls, setAvatarUrls] = useState<AvatarUrlMap>(
    { Yui: null, Levi: null, Erwin: null }
  );

  const [backgroundUrls, setBackgroundUrls] =
    useState<BgUrlMap>({
      Yui: null,
      Levi: null,
      Erwin: null,
    });

  const [postImageUrls, setPostImageUrls] = useState<
    Record<string, string>
  >({});

  const [notifications, setNotifications] = useState<
    ICityNotification[]
  >([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const notificationsInitializedRef = useRef(false);

  const postsRef = useRef<ICityPost[]>([]);
  const commentsRef = useRef<ICityComment[]>([]);

  const createdBlobUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);

  /* 初始化 */
  useEffect(() => {
    const savedPosts = loadPosts();
    const savedComments = loadComments();
    const savedProfiles = normalizeProfiles(
      loadProfiles()
    );

    setProfiles(savedProfiles);

    if (savedPosts.length === 0) {
      const cards = loadCards(defaultCards);
      const now = Date.now();
      const seed: ICityPost[] = [];

      const lText = composePostText(cards, "Levi");
      const eText = composePostText(cards, "Erwin");

      if (lText) {
        seed.push({
          id: createPostId(),
          author: "Levi",
          text: lText,
          timestamp: now - randInt(15, 120) * 60 * 1000,
          likes: [],
        });
      }

      if (eText) {
        seed.push({
          id: createPostId(),
          author: "Erwin",
          text: eText,
          timestamp: now - randInt(5, 60) * 60 * 1000,
          likes: [],
        });
      }

      seed.sort((a, b) => b.timestamp - a.timestamp);

      savePosts(seed);
      setPosts(seed);
      setComments(savedComments);
    } else {
      setPosts(savedPosts);
      setComments(savedComments);
    }
  }, []);

  /* -------------------------------------------------------
     ★ Bio 自动刷新调度
     ------------------------------------------------------- */

  useEffect(() => {
    function tick() {
      const cards = loadBioCards();
      const now = Date.now();

      setProfiles((prev) => {
        let changed = false;
        const next: ICityProfiles = { ...prev };

        for (const author of [
          "Levi",
          "Erwin",
        ] as const) {
          const profile = prev[author];

          if (!shouldRefreshBio(profile.lastBioUpdate)) {
            continue;
          }

          const picked = pickRandomBio(cards, author);
          if (!picked) continue;

          next[author] = {
            ...profile,
            bio: picked,
            lastBioUpdate: now,
          };
          changed = true;
        }

        if (!changed) return prev;

        saveProfiles(next);
        return next;
      });
    }

    /* 挂载立刻跑一次（处理首次/长期未打开的情况） */
    tick();

    /* 之后每 30 分钟跑一次 */
    const t = window.setInterval(
      tick,
      BIO_CHECK_INTERVAL_MS
    );
    return () => window.clearInterval(t);
  }, []);

  /* 加载头像 / 背景图 */
  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];

    async function loadImages() {
      const nextAvatar: AvatarUrlMap = {
        Yui: null,
        Levi: null,
        Erwin: null,
      };
      const nextBg: BgUrlMap = {
        Yui: null,
        Levi: null,
        Erwin: null,
      };

      for (const a of [
        "Yui",
        "Levi",
        "Erwin",
      ] as ICityAuthor[]) {
        try {
          const av = await getICityFile(avatarKey(a));
          if (av) {
            const url = URL.createObjectURL(av);
            created.push(url);
            createdBlobUrlsRef.current.add(url);
            nextAvatar[a] = url;
          }

          const bg = await getICityFile(backgroundKey(a));
          if (bg) {
            const url = URL.createObjectURL(bg);
            created.push(url);
            createdBlobUrlsRef.current.add(url);
            nextBg[a] = url;
          }
        } catch (e) {
          console.error("加载 iCity 图片失败:", a, e);
        }
      }

      if (cancelled) {
        created.forEach((u) => {
          URL.revokeObjectURL(u);
          createdBlobUrlsRef.current.delete(u);
        });
        return;
      }

      setAvatarUrls(nextAvatar);
      setBackgroundUrls(nextBg);
    }

    void loadImages();

    return () => {
      cancelled = true;
    };
  }, []);

  /* 加载帖子配图 */
  useEffect(() => {
    let cancelled = false;

    async function loadPostImages() {
      const current = postImageUrls;
      const next = { ...current };
      let changed = false;

      for (const post of postsRef.current) {
        if (!post.imageIds || post.imageIds.length === 0)
          continue;

        for (const imageId of post.imageIds) {
          if (next[imageId]) continue;

          try {
            const file = await getICityFile(imageId);
            if (!file) continue;

            const url = URL.createObjectURL(file);
            createdBlobUrlsRef.current.add(url);
            next[imageId] = url;
            changed = true;
          } catch (e) {
            console.error("加载帖子配图失败:", e);
          }
        }
      }

      if (cancelled) return;
      if (changed) setPostImageUrls(next);
    }

    void loadPostImages();

    return () => {
      cancelled = true;
    };
  }, [posts, postImageUrls]);

  useEffect(() => {
    return () => {
      createdBlobUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      createdBlobUrlsRef.current.clear();
    };
  }, []);

  const commitPosts = useCallback(
    (next: ICityPost[]) => {
      setPosts(next);
      postsRef.current = next;
      savePosts(next);
    },
    []
  );

  const commitComments = useCallback(
    (next: ICityComment[]) => {
      setComments(next);
      commentsRef.current = next;
      saveComments(next);
    },
    []
  );

  /* -------------------------------------------------------
     ★ 通知扫描
     ------------------------------------------------------- */

  useEffect(() => {
    if (posts.length === 0 && comments.length === 0) {
      return;
    }

    const events = collectInteractions(posts, comments);

    if (!notificationsInitializedRef.current) {
      notificationsInitializedRef.current = true;

      const storedNotifs = loadNotifications();
      const storedSeen = loadSeenIds();

      if (
        storedNotifs.length === 0 &&
        storedSeen.size === 0
      ) {
        const ids = new Set(events.map((e) => e.id));
        seenIdsRef.current = ids;
        saveSeenIds(ids);
        return;
      }

      seenIdsRef.current = storedSeen;
      setNotifications(storedNotifs);
      return;
    }

    const seen = seenIdsRef.current;
    const newOnes: ICityNotification[] = [];
    const newSeen = new Set(seen);

    for (const ev of events) {
      if (seen.has(ev.id)) continue;
      newOnes.push(ev);
      newSeen.add(ev.id);
    }

    if (newOnes.length === 0) return;

    seenIdsRef.current = newSeen;
    saveSeenIds(newSeen);

    setNotifications((prev) => {
      const next = [...prev, ...newOnes]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 200);
      saveNotifications(next);
      return next;
    });
  }, [posts, comments]);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => {
      if (prev.every((n) => n.read)) return prev;
      const next = prev.map((n) =>
        n.read ? n : { ...n, read: true }
      );
      saveNotifications(next);
      return next;
    });
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    saveNotifications([]);
  }, []);

  /* -------------------------------------------------------
     自动发帖
     ------------------------------------------------------- */

  const performAutoPost = useCallback(() => {
    const cards = loadCards(defaultCards);
    const character = pickRandomCharacter();
    const text = composePostText(cards, character);
    if (!text) return;

    const newPost: ICityPost = {
      id: createPostId(),
      author: character,
      text,
      timestamp: Date.now(),
      likes: [],
    };

    commitPosts([newPost, ...postsRef.current]);
  }, [commitPosts]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null =
      null;

    function schedule() {
      const delay = randInt(
        POST_MIN_DELAY,
        POST_MAX_DELAY
      );

      timer = setTimeout(() => {
        if (cancelled) return;
        try {
          performAutoPost();
        } catch (e) {
          console.error("iCity auto post failed:", e);
        }
        schedule();
      }, delay);
    }

    schedule();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [performAutoPost]);

  /* -------------------------------------------------------
     评论回复链
     ------------------------------------------------------- */

  const scheduleReactionsToComment = useCallback(
    (sourceComment: ICityComment, depth = 0) => {
      if (depth > MAX_REPLY_DEPTH) return;

      const cards = loadCards(defaultCards);

      for (const character of [
        "Levi",
        "Erwin",
      ] as Character[]) {
        if (sourceComment.author === character) continue;
        if (Math.random() > REPLY_TRIGGER_CHANCE)
          continue;

        const asReply =
          Math.random() < REPLY_AS_REPLY_CHANCE;
        const text = pickCommentText(cards, character);
        if (!text) continue;

        const delay = randInt(
          REACT_MIN_DELAY,
          REACT_MAX_DELAY
        );

        setTimeout(() => {
          const stillExists = postsRef.current.some(
            (p) => p.id === sourceComment.postId
          );
          if (!stillExists) return;

          const newComment: ICityComment = {
            id: createCommentId(),
            postId: sourceComment.postId,
            author: character,
            text,
            timestamp: Date.now(),
            ...(asReply
              ? { replyToCommentId: sourceComment.id }
              : {}),
          };

          commitComments([
            ...commentsRef.current,
            newComment,
          ]);

          scheduleReactionsToComment(
            newComment,
            depth + 1
          );
        }, delay);
      }
    },
    [commitComments]
  );

  const scheduleReactionsToUserPost = useCallback(
    (post: ICityPost) => {
      const cards = loadCards(defaultCards);

      for (const character of [
        "Levi",
        "Erwin",
      ] as Character[]) {
        if (Math.random() < REACT_LIKE_CHANCE) {
          const delay = randInt(
            REACT_MIN_DELAY,
            REACT_MAX_DELAY
          );

          setTimeout(() => {
            const list = postsRef.current;
            const target = list.find(
              (p) => p.id === post.id
            );
            if (!target) return;
            if (target.likes.includes(character)) return;

            const next = list.map((p) =>
              p.id === post.id
                ? {
                    ...p,
                    likes: [...p.likes, character],
                  }
                : p
            );

            commitPosts(next);
          }, delay);
        }

        if (Math.random() < REACT_COMMENT_CHANCE) {
          const text = pickCommentText(
            cards,
            character
          );
          if (!text) continue;

          const delay = randInt(
            REACT_MIN_DELAY,
            REACT_MAX_DELAY
          );

          setTimeout(() => {
            const stillExists =
              postsRef.current.some(
                (p) => p.id === post.id
              );
            if (!stillExists) return;

            const newComment: ICityComment = {
              id: createCommentId(),
              postId: post.id,
              author: character,
              text,
              timestamp: Date.now(),
            };

            commitComments([
              ...commentsRef.current,
              newComment,
            ]);

            scheduleReactionsToComment(newComment, 1);
          }, delay);
        }
      }
    },
    [
      commitPosts,
      commitComments,
      scheduleReactionsToComment,
    ]
  );

  /* -------------------------------------------------------
     立即触发一次互动
     ------------------------------------------------------- */

  const forceInteraction = useCallback(() => {
    const list = postsRef.current;

    if (list.length === 0) {
      performAutoPost();
      return;
    }

    const r = Math.random();

    if (r < 0.4) {
      performAutoPost();
      return;
    }

    if (r < 0.7) {
      const character = pickRandomCharacter();
      const candidates = list.filter(
        (p) => !p.likes.includes(character)
      );

      if (candidates.length === 0) {
        performAutoPost();
        return;
      }

      const target =
        candidates[
          Math.floor(Math.random() * candidates.length)
        ];

      const next = list.map((p) =>
        p.id === target.id
          ? { ...p, likes: [...p.likes, character] }
          : p
      );

      commitPosts(next);
      return;
    }

    const cards = loadCards(defaultCards);
    const character = pickRandomCharacter();
    const target =
      list[Math.floor(Math.random() * list.length)];
    const text = pickCommentText(cards, character);

    if (!text) {
      performAutoPost();
      return;
    }

    const newComment: ICityComment = {
      id: createCommentId(),
      postId: target.id,
      author: character,
      text,
      timestamp: Date.now(),
    };

    commitComments([...commentsRef.current, newComment]);

    if (Math.random() < 0.5) {
      scheduleReactionsToComment(newComment, 0);
    }
  }, [
    commitPosts,
    commitComments,
    performAutoPost,
    scheduleReactionsToComment,
  ]);

  /* -------------------------------------------------------
     Profile 操作
     ------------------------------------------------------- */

  const updateProfile = useCallback(
    (
      author: ICityAuthor,
      patch: Partial<ICityProfile>
    ) => {
      setProfiles((prev) => {
        const current = prev[author];

        const next: ICityProfiles = {
          ...prev,
          [author]: {
            name:
              patch.name !== undefined &&
              isValidName(patch.name)
                ? patch.name.trim()
                : current.name,
            handle:
              patch.handle !== undefined
                ? patch.handle.trim().replace(/^@/, "")
                : current.handle,
            bio:
              patch.bio !== undefined
                ? patch.bio
                : current.bio,
            lastBioUpdate:
              patch.lastBioUpdate !== undefined
                ? patch.lastBioUpdate
                : current.lastBioUpdate,
          },
        };
        saveProfiles(next);
        return next;
      });
    },
    []
  );

  const setAvatarFile = useCallback(
    async (author: ICityAuthor, file: File) => {
      await saveICityFile(avatarKey(author), file);

      const url = URL.createObjectURL(file);
      createdBlobUrlsRef.current.add(url);

      setAvatarUrls((prev) => {
        const old = prev[author];
        if (old) {
          URL.revokeObjectURL(old);
          createdBlobUrlsRef.current.delete(old);
        }
        return { ...prev, [author]: url };
      });
    },
    []
  );

  const removeAvatar = useCallback(
    async (author: ICityAuthor) => {
      await deleteICityFile(avatarKey(author));

      setAvatarUrls((prev) => {
        const old = prev[author];
        if (old) {
          URL.revokeObjectURL(old);
          createdBlobUrlsRef.current.delete(old);
        }
        return { ...prev, [author]: null };
      });
    },
    []
  );

  const setBackgroundFile = useCallback(
    async (author: ICityAuthor, file: File) => {
      await saveICityFile(backgroundKey(author), file);

      const url = URL.createObjectURL(file);
      createdBlobUrlsRef.current.add(url);

      setBackgroundUrls((prev) => {
        const old = prev[author];
        if (old) {
          URL.revokeObjectURL(old);
          createdBlobUrlsRef.current.delete(old);
        }
        return { ...prev, [author]: url };
      });
    },
    []
  );

  const removeBackground = useCallback(
    async (author: ICityAuthor) => {
      await deleteICityFile(backgroundKey(author));

      setBackgroundUrls((prev) => {
        const old = prev[author];
        if (old) {
          URL.revokeObjectURL(old);
          createdBlobUrlsRef.current.delete(old);
        }
        return { ...prev, [author]: null };
      });
    },
    []
  );

  /* -------------------------------------------------------
     用户操作
     ------------------------------------------------------- */

  const addUserPost = useCallback(
    (text: string, files?: File[]) => {
      const trimmed = text.trim();
      const hasImages = !!files && files.length > 0;
      if (!trimmed && !hasImages) return;

      const postId = createPostId();
      const imageIds: string[] = [];

      const saveImages = async () => {
        if (!files || files.length === 0) return;

        const limited = files.slice(0, 2);

        for (let i = 0; i < limited.length; i++) {
          const file = limited[i];
          const id = postImageKey(postId, i);

          try {
            await saveICityFile(id, file);

            imageIds.push(id);

            const url = URL.createObjectURL(file);
            createdBlobUrlsRef.current.add(url);

            setPostImageUrls((prev) => ({
              ...prev,
              [id]: url,
            }));
          } catch (e) {
            console.error("保存帖子配图失败:", e);
          }
        }
      };

      const newPost: ICityPost = {
        id: postId,
        author: "Yui",
        text: trimmed,
        timestamp: Date.now(),
        likes: [],
      };

      commitPosts([newPost, ...postsRef.current]);
      scheduleReactionsToUserPost(newPost);

      void (async () => {
        await saveImages();

        if (imageIds.length === 0) return;

        const list = postsRef.current;
        const next = list.map((p) =>
          p.id === postId
            ? { ...p, imageIds: [...imageIds] }
            : p
        );

        commitPosts(next);
      })();
    },
    [commitPosts, scheduleReactionsToUserPost]
  );

  const deletePost = useCallback(
    (postId: string) => {
      const target = postsRef.current.find(
        (p) => p.id === postId
      );

      if (target?.imageIds) {
        for (const imageId of target.imageIds) {
          void deleteICityFile(imageId);

          setPostImageUrls((prev) => {
            const copy = { ...prev };
            const url = copy[imageId];
            if (url) {
              URL.revokeObjectURL(url);
              createdBlobUrlsRef.current.delete(url);
            }
            delete copy[imageId];
            return copy;
          });
        }
      }

      commitPosts(
        postsRef.current.filter(
          (p) => p.id !== postId
        )
      );

      commitComments(
        commentsRef.current.filter(
          (c) => c.postId !== postId
        )
      );
    },
    [commitPosts, commitComments]
  );

  const toggleLike = useCallback(
    (postId: string, asUser: boolean) => {
      if (!asUser) return;

      const list = postsRef.current;
      const target = list.find((p) => p.id === postId);
      if (!target) return;

      const liked = target.likes.includes("Yui");

      const next = list.map((p) =>
        p.id === postId
          ? {
              ...p,
              likes: liked
                ? p.likes.filter((a) => a !== "Yui")
                : [...p.likes, "Yui" as ICityAuthor],
            }
          : p
      );

      commitPosts(next);
    },
    [commitPosts]
  );

  const addUserComment = useCallback(
    (
      postId: string,
      text: string,
      replyToCommentId?: string
    ) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const newComment: ICityComment = {
        id: createCommentId(),
        postId,
        author: "Yui",
        text: trimmed,
        timestamp: Date.now(),
        ...(replyToCommentId
          ? { replyToCommentId }
          : {}),
      };

      commitComments([
        ...commentsRef.current,
        newComment,
      ]);

      scheduleReactionsToComment(newComment, 0);
    },
    [commitComments, scheduleReactionsToComment]
  );

  const deleteComment = useCallback(
    (commentId: string) => {
      const toDelete = new Set<string>([commentId]);
      let changed = true;

      while (changed) {
        changed = false;
        for (const c of commentsRef.current) {
          if (
            c.replyToCommentId &&
            toDelete.has(c.replyToCommentId) &&
            !toDelete.has(c.id)
          ) {
            toDelete.add(c.id);
            changed = true;
          }
        }
      }

      commitComments(
        commentsRef.current.filter(
          (c) => !toDelete.has(c.id)
        )
      );
    },
    [commitComments]
  );

  const getCommentsForPost = useCallback(
    (postId: string) =>
      commentsRef.current
        .filter((c) => c.postId === postId)
        .sort((a, b) => a.timestamp - b.timestamp),
    []
  );

  return (
    <ICityContext.Provider
      value={{
        posts,
        comments,
        profiles,
        avatarUrls,
        backgroundUrls,
        postImageUrls,
        updateProfile,
        setAvatarFile,
        removeAvatar,
        setBackgroundFile,
        removeBackground,
        addUserPost,
        deletePost,
        toggleLike,
        addUserComment,
        deleteComment,
        getCommentsForPost,
        forceInteraction,

        notifications,
        unreadCount: notifications.filter((n) => !n.read)
          .length,
        markAllNotificationsRead,
        clearNotifications,
      }}
    >
      {children}
    </ICityContext.Provider>
  );
}

export function useICity() {
  const context = useContext(ICityContext);
  if (!context) {
    throw new Error(
      "useICity must be used inside ICityProvider"
    );
  }
  return context;
}