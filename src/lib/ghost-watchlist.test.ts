import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  addGhostItem,
  clearGhost,
  getGhostItems,
  getGhostServerSnapshot,
  getGhostSnapshot,
  hasGhostItem,
  removeGhostItem,
  subscribeGhost,
} from "./ghost-watchlist";

// The store is a browser module (localStorage + window events). vitest runs in Node, so we stand up
// a minimal fake window before each test and tear it down after.
class FakeStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

beforeEach(() => {
  const listeners: Record<string, Array<(e: { type: string }) => void>> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  g.window = {
    localStorage: new FakeStorage(),
    addEventListener: (t: string, cb: (e: { type: string }) => void) => {
      (listeners[t] ||= []).push(cb);
    },
    removeEventListener: (t: string, cb: (e: { type: string }) => void) => {
      listeners[t] = (listeners[t] || []).filter((f) => f !== cb);
    },
    dispatchEvent: (e: { type: string }) => {
      (listeners[e.type] || []).forEach((f) => f(e));
      return true;
    },
  };
  g.CustomEvent = class {
    type: string;
    constructor(type: string) {
      this.type = type;
    }
  };
});

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  delete g.window;
  delete g.CustomEvent;
});

const movie = { tmdbId: 10, mediaType: "MOVIE" as const, status: "WATCHLIST" as const, title: "Dangal", posterUrl: "/p.jpg" };

describe("ghost-watchlist store", () => {
  it("adds an item and reads it back with an addedAt stamp", () => {
    addGhostItem(movie);
    const items = getGhostItems();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ tmdbId: 10, mediaType: "MOVIE", title: "Dangal" });
    expect(typeof items[0].addedAt).toBe("string");
  });

  it("dedupes by tmdbId+mediaType, updating status instead of duplicating", () => {
    addGhostItem(movie);
    addGhostItem({ ...movie, status: "WATCHED" });
    const items = getGhostItems();
    expect(items).toHaveLength(1);
    expect(items[0].status).toBe("WATCHED");
  });

  it("treats the same tmdbId with a different mediaType as distinct", () => {
    addGhostItem(movie);
    addGhostItem({ ...movie, mediaType: "TV", title: "Dangal (series)" });
    expect(getGhostItems()).toHaveLength(2);
  });

  it("removes an item and reports membership", () => {
    addGhostItem(movie);
    expect(hasGhostItem(10, "MOVIE")).toBe(true);
    removeGhostItem(10, "MOVIE");
    expect(hasGhostItem(10, "MOVIE")).toBe(false);
    expect(getGhostItems()).toHaveLength(0);
  });

  it("clears everything", () => {
    addGhostItem(movie);
    addGhostItem({ ...movie, tmdbId: 11, title: "Other" });
    clearGhost();
    expect(getGhostItems()).toHaveLength(0);
  });

  it("notifies subscribers on change and stops after unsubscribe", () => {
    const cb = vi.fn();
    const unsub = subscribeGhost(cb);
    addGhostItem(movie);
    expect(cb).toHaveBeenCalledTimes(1);
    unsub();
    addGhostItem({ ...movie, tmdbId: 12 });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("returns a stable snapshot reference until the store changes", () => {
    addGhostItem(movie);
    const a = getGhostSnapshot();
    const b = getGhostSnapshot();
    expect(a).toBe(b); // same reference — safe for useSyncExternalStore
    addGhostItem({ ...movie, tmdbId: 13 });
    expect(getGhostSnapshot()).not.toBe(a);
  });

  it("server snapshot is a stable empty array", () => {
    expect(getGhostServerSnapshot()).toEqual([]);
    expect(getGhostServerSnapshot()).toBe(getGhostServerSnapshot());
  });
});
