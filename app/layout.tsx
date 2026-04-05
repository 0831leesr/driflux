import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
    default: "Richzem - 치지직 게임 스트리밍 & 스팀 할인",
    template: "%s | Richzem",
  },
  description:
    "치지직 라이브 방송 트렌드, 스팀 할인·메타 정보, 게임·스트리머 탐색을 한곳에서. 한국 스트리밍을 위한 데이터 기반 게임 플랫폼.",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "Richzem",
    title: "Richzem - 치지직 게임 스트리밍 & 스팀 할인",
    description:
      "치지직 라이브 방송 트렌드, 스팀 할인·메타 정보, 게임·스트리머 탐색을 한곳에서. 한국 스트리밍을 위한 데이터 기반 게임 플랫폼.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Richzem" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Richzem - 치지직 게임 스트리밍 & 스팀 할인",
    description: "치지직 라이브 방송 트렌드와 스팀 게임 정보를 한곳에서 탐색하세요.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerAuth = <AppHeaderAuth />;

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
                    <AppShell headerAuth={headerAuth}>{children}</AppShell>
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
