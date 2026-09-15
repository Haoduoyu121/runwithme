export type VoiceCharacter = "Levi" | "Erwin";

export type VoiceCard = {
  id: string;
  character: VoiceCharacter;

  // MP3 文件在 IndexedDB 中对应的 ID
  mediaId: string;

  // 原始文件名，方便 Studio 显示
  fileName: string;

  // 这条语音对应的文字稿
  transcript: string;

  // 是否参与随机抽卡
  enabled: boolean;
};