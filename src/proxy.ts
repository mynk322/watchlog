import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/cron/refresh",
  "/api/admin/claim-legacy-titles",
  "/opengraph-image",
  "/t/(.*)/opengraph-image",
  // Generated metadata icons have no file extension, so the matcher below doesn't exclude them —
  // list them here or a logged-out tab/PWA can't load the app icon.
  "/icon",
  "/apple-icon",
  // Shareable, read-only pages a logged-out visitor can land on. `:handle`/`:id` match a single
  // segment only, so social sub-pages (/u/[handle]/followers, /following) and all write APIs stay
  // protected — the follower graph is other people's identities, not public.
  "/t/:id",
  "/u/:handle",
  "/list",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
