import { describe, expect, it } from "vitest";
import { StopThePromisePoolError } from "../stop-the-promise-pool-error.js";

describe("StopThePromisePoolError", () => {
  it("should extend Error", () => {
    const err = new StopThePromisePoolError("stop");
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("stop");
  });
});
