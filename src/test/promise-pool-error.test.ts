import { describe, expect, it } from "vitest";
import { PromisePoolError } from "../promise-pool-error.js";

describe("PromisePoolError", () => {
  it("should extend Error and accept generic types", () => {
    const error = new Error("fail");
    const item = "foo";
    const err = new PromisePoolError(error, item);
    expect(err).toBeInstanceOf(Error);
    expect(err.item).toBe(item);
    expect(err.raw).toBe(error);
    expect(err.message).toBe("fail");
  });

  describe("messageFrom", () => {
    it("returns message for Error instance", () => {
      const err = new PromisePoolError(new Error("fail"), "item");
      expect(err.message).toBe("fail");
    });
    it("returns message for object with message", () => {
      const err = new PromisePoolError({ message: "obj fail" }, "item");
      expect(err.message).toBe("obj fail");
    });
    it("returns string for string input", () => {
      const err = new PromisePoolError("string fail", "item");
      expect(err.message).toBe("string fail");
    });
    it("returns string for number input", () => {
      const err = new PromisePoolError(42, "item");
      expect(err.message).toBe("42");
    });
    it("returns empty string for unknown input", () => {
      const err = new PromisePoolError(undefined, "item");
      expect(err.message).toBe("");
    });
  });
});
