import type {
  ICityPost,
  ICityComment,
  ICityProfiles,
} from "@/data/icity";

import { DEFAULT_PROFILES } from "@/data/icity";

const POSTS_KEY = "runwithme_icity_posts";
const COMMENTS_KEY = "runwithme_icity_comments";
const PROFILES_KEY = "runwithme_icity_profiles";

export function loadPosts(): ICityPost[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(POSTS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (p) =>
        p &&
        typeof p.id === "string" &&
        typeof p.text === "string" &&
        typeof p.timestamp === "number" &&
        Array.isArray(p.likes)
    );
  } catch {
    return [];
  }
}

export function savePosts(posts: ICityPost[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    POSTS_KEY,
    JSON.stringify(posts)
  );
}

export function loadComments(): ICityComment[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(COMMENTS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (c) =>
        c &&
        typeof c.id === "string" &&
        typeof c.postId === "string" &&
        typeof c.text === "string" &&
        typeof c.timestamp === "number"
    );
  } catch {
    return [];
  }
}

export function saveComments(
  comments: ICityComment[]
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    COMMENTS_KEY,
    JSON.stringify(comments)
  );
}

export function loadProfiles(): ICityProfiles {
  if (typeof window === "undefined") {
    return DEFAULT_PROFILES;
  }

  try {
    const raw = window.localStorage.getItem(PROFILES_KEY);
    if (!raw) return DEFAULT_PROFILES;

    const parsed = JSON.parse(raw);

    function normalize(
      key: "Yui" | "Levi" | "Erwin"
    ) {
      const fallback = DEFAULT_PROFILES[key];
      const input = parsed?.[key];

      return {
        name:
          typeof input?.name === "string" &&
          input.name.trim()
            ? input.name.trim()
            : fallback.name,
        handle:
          typeof input?.handle === "string"
            ? input.handle.trim()
            : fallback.handle,
      };
    }

    return {
      Yui: { name: "...", handle: "...", bio: "", lastBioUpdate: 0 },
      Levi: { name: "...", handle: "...", bio: "", lastBioUpdate: 0 },
      Erwin: { name: "...", handle: "...", bio: "", lastBioUpdate: 0 },
    };
  } catch {
    return DEFAULT_PROFILES;
  }
}

export function saveProfiles(
  profiles: ICityProfiles
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    PROFILES_KEY,
    JSON.stringify(profiles)
  );
}