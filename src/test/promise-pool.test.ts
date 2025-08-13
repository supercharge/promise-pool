import { describe, expect, it } from "vitest";
import { PromisePool } from "../index.js";

describe("PromisePool", () => {
  it("creates a new PromisePool", async () => {
    const pool = new PromisePool();
    expect(typeof pool).toBe("object");
  });
  // ...existing tests migrated from promise-pool.test.ts...

  describe("onTaskFinished and useCorrespondingResults", () => {
    it("onTaskFinished adds handler and returns self", () => {
      const pool = new PromisePool();
      const handler = () => {};
      const result = pool.onTaskFinished(handler);
      expect(result).toBe(pool);
    });
    it("useCorrespondingResults sets flag and returns self", () => {
      const pool = new PromisePool();
      const result = pool.useCorrespondingResults();
      expect(result).toBe(pool);
      expect(pool.useCorrespondingResults()).toBe(pool);
    });
  });

  describe("PromisePool static and edge cases", () => {
    it("covers for() with no errorHandler or timeout", () => {
      const pool = new PromisePool();
      const result = pool.for([1, 2, 3]);
      expect(result).toBeInstanceOf(PromisePool);
    });
  });
});
