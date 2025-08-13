import { describe, expect, it, vi } from "vitest";
import { PromisePoolExecutor } from "../promise-pool-executor.js";
import { StopThePromisePoolError } from "../stop-the-promise-pool-error.js";
import { ValidationError } from "../validation-error.js";

// Basic handler for testing
const asyncHandler = async (item: number) => item * 2;

describe("PromisePoolExecutor", () => {
  it("processes items with default concurrency", async () => {
    const items = [1, 2, 3];
    const executor = new PromisePoolExecutor<number, number>()
      .for(items)
      .withHandler(asyncHandler);
    const result = await executor.start();
    expect(result.results).toEqual([2, 4, 6]);
    expect(result.errors).toEqual([]);
  });

  it("respects concurrency setting", async () => {
    const items = [1, 2, 3, 4, 5];
    const executor = new PromisePoolExecutor<number, number>()
      .for(items)
      .useConcurrency(2)
      .withHandler(asyncHandler);
    expect(executor.concurrency()).toBe(2);
    const result = await executor.start();
    expect(result.results).toEqual([2, 4, 6, 8, 10]);
  });

  it("throws on invalid concurrency", () => {
    const executor = new PromisePoolExecutor<number, number>();
    expect(() => executor.useConcurrency(0)).toThrow(ValidationError);
  });

  it("handles errors with errorHandler", async () => {
    const items = [1, 2];
    const errorHandler = vi.fn();
    const executor = new PromisePoolExecutor<number, number>()
      .for(items)
      .withHandler(async (item) => {
        if (item === 2) throw new Error("fail");
        return item;
      })
      .handleError(errorHandler);
    const result = await executor.start();
    // Use PromisePool.failed for failed results
    const { PromisePool } = await import("../promise-pool");
    expect(result.results).toEqual([1, PromisePool.failed]);
    expect(result.errors.length).toBe(1);
    expect(errorHandler).toHaveBeenCalled();
  });

  it("stops processing when stop is called", async () => {
    const items = [1, 2, 3];
    const executor = new PromisePoolExecutor<number, number>()
      .for(items)
      .withHandler(async (item, _, pool) => {
        if (item === 2) pool.stop();
        return item;
      });
    await expect(executor.start()).rejects.toThrow(StopThePromisePoolError);
  });

  it("uses corresponding results", async () => {
    const items = [1, 2, 3];
    const executor = new PromisePoolExecutor<number, number>()
      .for(items)
      .useCorrespondingResults(true)
      .withHandler(asyncHandler);
    const result = await executor.start();
    expect(result.results).toEqual([2, 4, 6]);
  });

  it("handles task timeout", async () => {
    const items = [1];
    const executor = new PromisePoolExecutor<number, number>()
      .for(items)
      .withHandler(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return 42;
      })
      .withTaskTimeout(10);
    const result = await executor.start();
    expect(result.errors.length).toBe(1);
    // Use PromisePool.failed for failed results
    const { PromisePool } = await import("../promise-pool");
    expect(result.results[0]).toBe(PromisePool.failed);
  });
});
