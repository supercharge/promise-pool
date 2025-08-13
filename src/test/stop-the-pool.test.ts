import { describe, expect, it } from "vitest";
import { PromisePool } from "../index.js";

const pause = (timeout: number) =>
  new Promise((resolve) => setTimeout(resolve, timeout));

describe("PromisePool stop", () => {
  it("stops the pool from .process", async () => {
    const timeouts = [10, 20, 30, 40, 50];
    await expect(
      PromisePool.for(timeouts).process(async (timeout, _, pool) => {
        if (timeout > 30) {
          return pool.stop();
        }
        await pause(timeout);
        return timeout;
      }),
    ).rejects.toThrow();
  });
  // ...existing tests migrated from stop-the-pool.test.ts...
});
