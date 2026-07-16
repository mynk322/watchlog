export function isValidRating(value: unknown): value is number {
  return typeof value === "number" && value >= 0.5 && value <= 5 && Number.isInteger(value * 2);
}
