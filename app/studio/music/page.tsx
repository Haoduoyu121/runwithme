"use client";

import { useRouter } from "next/navigation";

export default function StudioMusicPage() {
  const router = useRouter();

  return (
    <main className="studio-page">
      <div
        style={{
          maxWidth: 480,
          margin: "80px auto",
          padding: 32,
          textAlign: "center",
        }}
      >
        <div className="studio-eyebrow">MOVED</div>

        <h1 style={{ marginTop: 8 }}>Music Studio</h1>

        <p style={{ opacity: 0.6, lineHeight: 1.7 }}>
          音乐管理已经移到 Music 页面。 <br />
          打开 Music，点右上角 ↑ 即可添加、编辑、删除音乐。
        </p>

        <button
          className="studio-add-button"
          onClick={() => router.push("/")}
          style={{ marginTop: 20 }}
        >
          ← 返回 Home
        </button>
      </div>
    </main>
  );
}