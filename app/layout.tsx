import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { FavoritesProvider } from "@/contexts/favorites-context";
import { CalendarSettingsProvider } from "@/contexts/calendar-settings-context";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://driflux.vercel.app"),
  title: {
    default: "Driflux - Discover Game Streams & Sales",
    template: "%s | Driflux",
  },
  description: "Watch live game streams, find Steam sales, and discover new games. Your ultimate gaming streaming platform.",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Driflux",
    title: "Driflux - Discover Game Streams & Sales",
    description: "Watch live game streams, find Steam sales, and discover new games. Your ultimate gaming streaming platform.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Driflux" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Driflux - Discover Game Streams & Sales",
    description: "Watch live game streams, find Steam sales, and discover new games.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full overflow-hidden" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-screen overflow-hidden antialiased bg-background`}
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <FavoritesProvider>
            <CalendarSettingsProvider>
              <AppShell>{children}</AppShell>
            </CalendarSettingsProvider>
          </FavoritesProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
