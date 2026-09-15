export type WallpaperId =
  | "default-rose"
  | "default-paper"
  | "default-night";

export type Wallpaper = {
  id: WallpaperId;
  name: string;
  background: string;
};

export const wallpapers: Wallpaper[] = [
  {
    id: "default-rose",
    name: "Rose",
    background:
      "radial-gradient(circle at 20% 20%, rgba(255,220,225,.8), transparent 35%), radial-gradient(circle at 80% 70%, rgba(207,222,227,.7), transparent 40%), linear-gradient(145deg, #fcbec3, #fff2e9 55%, #cfdee3)",
  },

  {
    id: "default-paper",
    name: "Paper",
    background:
      "radial-gradient(circle at 30% 20%, rgba(255,255,255,.9), transparent 30%), linear-gradient(135deg, #eee8df, #d8d0c4 50%, #b8b0a5)",
  },

  {
    id: "default-night",
    name: "Night",
    background:
      "radial-gradient(circle at 70% 20%, rgba(142,101,111,.55), transparent 30%), radial-gradient(circle at 20% 80%, rgba(207,222,227,.15), transparent 35%), linear-gradient(145deg, #17151a, #29252b 55%, #40353c)",
  },
];

export function getWallpaper(
  id: string
): Wallpaper {
  return (
    wallpapers.find(
      (wallpaper) => wallpaper.id === id
    ) ?? wallpapers[0]
  );
}