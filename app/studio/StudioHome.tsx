"use client";

import Link from "next/link";

import {
  ChevronRight,
  Heart,
  Home,
  Image as ImageIcon,
  Music,
  Settings,
} from "lucide-react";

type StudioApp = {
  id: string;
  Icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
  }>;
  name: string;
  description: string;
  href: string;
  className: string;
};

const studioApps: StudioApp[] = [
  {
    id: "chat",
    Icon: Heart,
    name: "Chat Cards",
    description: "管理 Levi / Erwin 的对话卡片",
    href: "/studio/chat",
    className: "studio-nav-chat",
  },
  {
    id: "music",
    Icon: Music,
    name: "Music",
    description: "管理属于这个世界的声音",
    href: "/studio/music",
    className: "studio-nav-music",
  },
  {
    id: "photos",
    Icon: ImageIcon,
    name: "Photos",
    description: "管理照片与相册",
    href: "/studio/photos",
    className: "studio-nav-photos",
  },
  {
    id: "home",
    Icon: Home,
    name: "Home",
    description: "管理手机桌面与组件",
    href: "/studio/home",
    className: "studio-nav-home",
  },
  {
    id: "settings",
    Icon: Settings,
    name: "Settings",
    description: "RunWithme 世界设置",
    href: "/studio/settings",
    className: "studio-nav-settings",
  },
];

export default function StudioHome() {
  return (
    <main className="studio-home">
      <header className="studio-home-header">
        <div>
          <div className="studio-eyebrow">
            RUNWITHME
          </div>

          <h1>Studio</h1>

          <p>
            一个用来管理这个小世界的地方。
          </p>
        </div>

        <div className="studio-home-mark">
          RWM
        </div>
      </header>

      <section className="studio-nav-grid">
        {studioApps.map((app) => {
          const Icon = app.Icon;
          return (
            <Link
              key={app.id}
              href={app.href}
              className={`studio-nav-card ${app.className}`}
            >
              <div className="studio-nav-icon">
                <Icon size={22} strokeWidth={1.8} />
              </div>

              <div className="studio-nav-content">
                <h2>{app.name}</h2>

                <p>{app.description}</p>
              </div>

              <div className="studio-nav-arrow">
                <ChevronRight size={20} strokeWidth={2} />
              </div>
            </Link>
          );
        })}
      </section>

      <footer className="studio-home-footer">
        <span>
          RUN WITH ME
        </span>

        <span>
          private little universe
        </span>
      </footer>
    </main>
  );
}