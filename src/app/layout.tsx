import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Show } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { ThemeProvider } from "@/components/theme-provider";
import { AppClerkProvider } from "@/components/app-clerk-provider";
import { SiteHeader } from "@/components/site-header";
import { GhostMerge } from "@/components/ghost-merge";
import { prisma } from "@/lib/prisma";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Watchlog",
  description: "A personal, ever-growing log of everything watched — movies and series, sorted by year.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();
  // Only used as the SSR default for a device that's never set a local theme preference —
  // once next-themes' own localStorage value exists, that always wins on subsequent visits.
  const settings = userId ? await prisma.userSettings.findUnique({ where: { userId }, select: { theme: true } }) : null;
  const themeDefault = settings?.theme ?? "dark";

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-background text-foreground">
        {/* ThemeProvider wraps Clerk so AppClerkProvider can read the resolved theme and hand Clerk
            concrete light/dark colors (its widgets can't follow CSS var()s). */}
        <ThemeProvider attribute="data-theme" defaultTheme={themeDefault} enableSystem={false}>
          <AppClerkProvider defaultTheme={themeDefault}>
            <Show when="signed-in">
              <GhostMerge />
            </Show>
            <SiteHeader />
            <main id="top" className="flex-1">
              {children}
            </main>
          </AppClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
