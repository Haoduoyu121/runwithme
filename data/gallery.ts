export type GalleryOwner = "Levi" | "Erwin";

export type GalleryItem = {
  id: string;
  owner: GalleryOwner;
  fileName: string;
  enabled: boolean;
};

export function createGalleryId(): string {
  return `gallery-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}