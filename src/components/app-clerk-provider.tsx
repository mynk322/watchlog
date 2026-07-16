"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";

// Concrete (not var()) colors per theme: Clerk does color math to derive shades for popovers,
// borders, hovers, etc., and can't parse CSS var()s — passing vars left the UserButton menu and
// sign-in card stuck on Clerk's default dark theme. These mirror the app tokens in globals.css.
const SHARED = { borderRadius: "0.75rem" } as const;

const DARK = {
  colorPrimary: "#ff3b5c",
  colorBackground: "#141417",
  colorInputBackground: "#1c1c21",
  colorText: "#f5f5f7",
  colorInputText: "#f5f5f7",
  colorTextSecondary: "#9a9aa3",
  colorNeutral: "#ffffff", // neutral scale is generated from this; light-on-dark in dark mode
  ...SHARED,
};

const LIGHT = {
  colorPrimary: "#e11d48",
  colorBackground: "#ffffff",
  colorInputBackground: "#ffffff",
  colorText: "#16161a",
  colorInputText: "#16161a",
  colorTextSecondary: "#5f5f68",
  colorNeutral: "#0a0a0c", // dark-on-light in light mode
  ...SHARED,
};

const ELEMENTS = {
  // Keep the form to email + password + continue — no OAuth row, no "or" divider.
  socialButtonsRoot: { display: "none" },
  dividerRow: { display: "none" },
  cardBox: { boxShadow: "none" },
};

export function AppClerkProvider({ children, defaultTheme }: { children: ReactNode; defaultTheme: string }) {
  const { resolvedTheme } = useTheme();
  // resolvedTheme is undefined until mounted; fall back to the server-known default to avoid a flash.
  const isLight = (resolvedTheme ?? defaultTheme) === "light";
  return (
    <ClerkProvider
      appearance={{ variables: isLight ? LIGHT : DARK, elements: ELEMENTS }}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
    >
      {children}
    </ClerkProvider>
  );
}
