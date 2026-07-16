/**
 * Clerk's dev instance rate-limits the Backend API. The E2E suite makes many calls (user lookups,
 * sign-in tokens), so wrap them to back off and retry on 429 rather than failing the run.
 */
export async function withClerkRetry<T>(fn: () => Promise<T>, attempts = 6): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      const status = (e as { status?: number })?.status;
      if (status !== 429) throw e;
      lastErr = e;
      await new Promise((r) => setTimeout(r, 3000 * (i + 1))); // 3s, 6s, 9s, …
    }
  }
  throw lastErr;
}
