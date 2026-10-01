export type AvatarLibraryOwner = "Levi" | "Erwin";
export type AvatarLibraryScope = "chat" | "icity";

export type AvatarLibraryItem = {
  id: string;
  owner: AvatarLibraryOwner;
  scope: AvatarLibraryScope;
  fileName: string;
  enabled: boolean;
};

export function createAvatarLibraryId(): string {
  return `avlib-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}