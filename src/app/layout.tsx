import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { prisma } from "@/lib/prisma";
import "./globals.css";

const clerkAppearance = {
  variables: {
    colorPrimary: "#ff3b5c",
    colorBackground: "#141417",
    colorInputBackground: "#1c1c21",
    colorText: "#f5f5f7",
    colorTextSecondary: "#9a9aa3",
    colorNeutral: "#f5f5f7",
    borderRadius: "0.75rem",
  },
  elements: {
    // Keep the form to email + password + continue — no OAuth row, no "or" divider.
    socialButtonsRoot: { display: "none" },
    dividerRow: { display: "none" },
    cardBox: { boxShadow: "none" },
  },
};

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

  return (
    <ClerkProvider appearance={clerkAppearance} signInUrl="/sign-in" signUpUrl="/sign-up">
      <html
        lang="en"
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body suppressHydrationWarning className="min-h-full flex flex-col bg-background text-foreground">
          <ThemeProvider attribute="data-theme" defaultTheme={settings?.theme ?? "dark"} enableSystem={false}>
            <SiteHeader />
            <main id="top" className="flex-1">
              {children}
            </main>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
