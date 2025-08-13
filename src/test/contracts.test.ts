import { describe, expect, it } from "vitest";
import type {
  ErrorHandler,
  SomeIterable,
  Statistics,
  Stoppable,
  UsesConcurrency,
} from "../contracts.js";

describe("contracts types", () => {
  it("should allow correct usage of interfaces and types", () => {
    const usesConcurrency: UsesConcurrency = {
      useConcurrency: (_c: number) => usesConcurrency,
      concurrency: () => 2,
    };
    const stoppable: Stoppable = {
      stop: () => {},
      isStopped: () => false,
    };
    const stats: Statistics<number> = {
      activeTaskCount: () => 1,
      activeTasksCount: () => 1,
      processedItems: () => [1],
      processedCount: () => 1,
      processedPercentage: () => 100,
    };
    const errorHandler: ErrorHandler<number> = (_err, _item, _pool) => {};
    // ProcessHandler and OnProgressCallback types
    // ...existing code...
    expect(usesConcurrency.concurrency()).toBe(2);
    expect(typeof stoppable.stop).toBe("function");
    expect(stats.processedCount()).toBe(1);
    expect(typeof errorHandler).toBe("function");
    const iterable: SomeIterable<number> = [1, 2, 3];
    expect(Array.isArray(iterable)).toBe(true);
  });
  it("Stoppable and UsesConcurrency interfaces", () => {
    const stoppable: Stoppable = {
      stop: () => {},
      isStopped: () => true,
    };
    expect(stoppable.isStopped()).toBe(true);
    const usesConcurrency: UsesConcurrency = {
      useConcurrency: (_: number) => usesConcurrency,
      concurrency: () => 5,
    };
    expect(usesConcurrency.concurrency()).toBe(5);
  });
});
