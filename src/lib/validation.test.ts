import { describe, it, expect } from "vitest";
import { isValidRating, isValidHandle, isValidDisplayName, normalizeHandle } from "./validation";

describe("isValidRating", () => {
  it("accepts half-star multiples from 0.5 to 5", () => {
    for (const v of [0.5, 1, 1.5, 2.5, 4, 5]) expect(isValidRating(v)).toBe(true);
  });

  it("rejects out-of-range, non-half-step, and non-number values", () => {
    for (const v of [0, 5.5, 6, -1, 1.25, 0.1]) expect(isValidRating(v)).toBe(false);
    for (const v of ["3", null, undefined, NaN]) expect(isValidRating(v)).toBe(false);
  });
});

describe("normalizeHandle", () => {
  it("trims surrounding whitespace and lowercases", () => {
    expect(normalizeHandle("  MyHandle ")).toBe("myhandle");
    expect(normalizeHandle("ALICE-01")).toBe("alice-01");
  });
});

describe("isValidHandle", () => {
  it("accepts 3–30 char lowercase alphanumeric/hyphen segments", () => {
    for (const v of ["abc", "a-b-c", "user123", "a".repeat(30), "x1-y2-z3"]) {
      expect(isValidHandle(v)).toBe(true);
    }
  });

  it("rejects bad length, casing, spacing, and hyphen placement", () => {
    for (const v of [
      "ab", // too short
      "a".repeat(31), // too long
      "Abc", // uppercase
      "a b", // space
      "-abc", // leading hyphen
      "abc-", // trailing hyphen
      "a--b", // double hyphen
      "user_name", // underscore
      "", // empty
    ]) {
      expect(isValidHandle(v)).toBe(false);
    }
    expect(isValidHandle(123)).toBe(false);
    expect(isValidHandle(null)).toBe(false);
  });
});

describe("isValidDisplayName", () => {
  it("accepts 1–50 chars after trimming", () => {
    expect(isValidDisplayName("A")).toBe(true);
    expect(isValidDisplayName("  Jane Doe  ")).toBe(true);
    expect(isValidDisplayName("x".repeat(50))).toBe(true);
  });

  it("rejects empty/whitespace-only, over-long, and non-strings", () => {
    expect(isValidDisplayName("")).toBe(false);
    expect(isValidDisplayName("   ")).toBe(false);
    expect(isValidDisplayName("x".repeat(51))).toBe(false);
    expect(isValidDisplayName(42)).toBe(false);
    expect(isValidDisplayName(undefined)).toBe(false);
  });
});
