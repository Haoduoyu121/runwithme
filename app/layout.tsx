import type { Metadata, Viewport } from "next";
import "./globals.css";

import { SystemProvider } from "@/lib/SystemContext";
import { CallProvider } from "@/lib/CallContext";
import { MusicProvider } from "@/lib/MusicContext";
import { ChatProvider } from "@/lib/ChatContext";
import { ICityProvider } from "@/lib/ICityContext";
import { PomodoroProvider } from "@/lib/PomodoroContext";

import CallUI from "@/components/call/CallUI";

export const metadata: Metadata = {
  title: "RunWithme",
  description:
    "a little world beyond the walls",
  applicationName: "RunWithme",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RunWithme",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff2e9" },
    { media: "(prefers-color-scheme: dark)", color: "#17131a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <SystemProvider>
          <CallProvider>
            <MusicProvider>
              <ChatProvider>
                <ICityProvider>
                  <PomodoroProvider>
                    {children}
                    <CallUI />
                  </PomodoroProvider>
                </ICityProvider>
              </ChatProvider>
            </MusicProvider>
          </CallProvider>
        </SystemProvider>
      </body>
    </html>
  );
}