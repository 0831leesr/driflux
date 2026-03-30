import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { AppHeaderAuth } from "@/components/header";
import { FavoritesProvider } from "@/contexts/favorites-context";
import { CalendarSettingsProvider } from "@/contexts/calendar-settings-context";
import { CustomEventsProvider } from "@/contexts/custom-events-context";
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
  title: {
    default: "Richzem - Discover Game Streams & Sales",
    template: "%s | Richzem",
  },
  description: "Watch live game streams, find Steam sales, and discover new games. Your ultimate gaming streaming platform.",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Richzem",
    title: "Richzem - Discover Game Streams & Sales",
    description: "Watch live game streams, find Steam sales, and discover new games. Your ultimate gaming streaming platform.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Richzem" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Richzem - Discover Game Streams & Sales",
    description: "Watch live game streams, find Steam sales, and discover new games.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerAuth = <AppHeaderAuth />;

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col antialiased bg-background`}
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <div className="flex min-h-0 flex-1 flex-col">
            <FavoritesProvider>
              <CalendarSettingsProvider>
                <CustomEventsProvider>
                  <AppShell headerAuth={headerAuth}>{children}</AppShell>
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
