import type { Metadata, Viewport } from "next";
import "./globals.css";

import { SystemProvider } from "@/lib/SystemContext";
import { CallProvider } from "@/lib/CallContext";
import { MusicProvider } from "@/lib/MusicContext";
import { ChatProvider } from "@/lib/ChatContext";
import { ICityProvider } from "@/lib/ICityContext";
import { PomodoroProvider } from "@/lib/PomodoroContext";
import { MusicInviteProvider } from "@/lib/MusicInviteContext";
import { LetterProvider } from "@/lib/LetterContext";
import { CollectionProvider } from "@/lib/CollectionContext";

import CallUI from "@/components/call/CallUI";
import FocusOverlay from "@/components/apps/checkin/FocusOverlay";
import FontScaleApplier from "@/components/FontScaleApplier";
import MusicInviteOverlay from "@/components/music/MusicInviteOverlay";
import { NotificationProvider } from "@/lib/NotificationContext";
import NotificationOverlay from "@/components/system/NotificationOverlay";
import KeyboardInsetListener from "@/components/system/KeyboardInsetListener";
import { WatchInviteScheduler } from "@/lib/WatchInviteScheduler";
import { KeepAliveProvider } from "@/lib/KeepAliveContext";

export const metadata: Metadata = {
  title: "RunWithme",
  description: "a little world beyond the walls",
  applicationName: "RunWithme",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
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
    {
      media: "(prefers-color-scheme: light)",
      color: "#fff2e9",
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: "#17131a",
    },
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
        <NotificationProvider>
          <KeepAliveProvider>
            <WatchInviteScheduler>
              <CollectionProvider>
              <CallProvider>
                <MusicProvider>
                  <ChatProvider>
                    <MusicInviteProvider>
                      <LetterProvider>
                        <ICityProvider>
                          <PomodoroProvider>
                            {children}
                            <CallUI />
                            <FontScaleApplier />
                            <MusicInviteOverlay />
                            <FocusOverlay />
                            <NotificationOverlay />
                            <KeyboardInsetListener />
                          </PomodoroProvider>
                        </ICityProvider>
                      </LetterProvider>
                    </MusicInviteProvider>
                  </ChatProvider>
                </MusicProvider>
              </CallProvider>
              </CollectionProvider>
            </WatchInviteScheduler>
          </KeepAliveProvider>
        </NotificationProvider>
      </SystemProvider>
</body>
    </html>
  );
}