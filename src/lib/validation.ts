export function isValidRating(value: unknown): value is number {
  return typeof value === "number" && value >= 0.5 && value <= 5 && Number.isInteger(value * 2);
}

export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 30;
export const DISPLAY_NAME_MAX_LENGTH = 50;
export const BIO_MAX_LENGTH = 300;

// Lowercase alphanumeric segments joined by single hyphens — no leading/trailing/double hyphens.
const HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Normalizes user-entered handle input the same way the server stores it, so client and server agree. */
export function normalizeHandle(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidHandle(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= HANDLE_MIN_LENGTH &&
    value.length <= HANDLE_MAX_LENGTH &&
    HANDLE_PATTERN.test(value)
  );
}

export function isValidDisplayName(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= DISPLAY_NAME_MAX_LENGTH;
}

/** Bio is optional; when present it must be a string within the length cap (empty clears it). */
export function isValidBio(value: unknown): value is string {
  return typeof value === "string" && value.trim().length <= BIO_MAX_LENGTH;
}
