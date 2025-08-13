import { describe, expect, it } from "vitest";
import { PromisePoolError } from "../promise-pool-error.js";
import type { ReturnValue } from "../return-value.js";

describe("ReturnValue interface", () => {
  it("should match the expected structure", () => {
    const error = new PromisePoolError(new Error("fail"), 1);
    const value: ReturnValue<number, string, Error> = {
      results: ["a", "b"],
      errors: [error],
    };
    expect(value.results).toEqual(["a", "b"]);
    expect(value.errors[0].message).toBe("fail");
    expect(value.errors[0].item).toBe(1);
  });
  it("ReturnValue supports multiple error types", () => {
    const value: ReturnValue<number, string, string> = {
      results: ["x"],
      errors: [{ message: "fail", item: 1 } as any],
    };
    expect(value.errors[0].message).toBe("fail");
  });
});
