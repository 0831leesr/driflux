import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { AppHeaderAuth } from "@/components/header";
import { FavoritesProvider } from "@/contexts/favorites-context";
import { CalendarSettingsProvider } from "@/contexts/calendar-settings-context";
import { CustomEventsProvider } from "@/contexts/custom-events-context";
import { FollowedEventsProvider } from "@/contexts/followed-events-context";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://richzem.vercel.app"),
  applicationName: "Richzem",
  title: {
    default: "Richzem",
    template: "%s | Richzem",
  },
  description:
    "치지직 라이브 방송 트렌드, 게임·스트리머 탐색",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "Richzem",
    title: "리치젬",
    description:
      "치지직 라이브 방송 트렌드, 게임·스트리머 탐색",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Richzem" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "리치젬",
    description: "치지직 라이브 방송 트렌드, 게임·스트리머 탐색",
  },
  verification: {
    other: {
      'naver-site-verification': 'e24fd215bac8f57e7288dc5b7e6eb219ce911059',
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerAuth = (
    <Suspense fallback={<div className="h-8 w-8 rounded-full bg-muted animate-pulse" />}>
      <AppHeaderAuth />
    </Suspense>
  );

  return (
    <html lang="ko" className="h-full" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col antialiased bg-background`}
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <div className="flex min-h-0 flex-1 flex-col">
            <FavoritesProvider>
              <CalendarSettingsProvider>
                <CustomEventsProvider>
                  <FollowedEventsProvider>
                    <AppShell headerAuth={headerAuth}>
                      {children}
                    </AppShell>
                  </FollowedEventsProvider>
                </CustomEventsProvider>
              </CalendarSettingsProvider>
            </FavoritesProvider>
          </div>
        </ThemeProvider>
        <Toaster richColors position="bottom-right" />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
