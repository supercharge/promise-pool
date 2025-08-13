import { describe, expect, it } from "vitest";
import { ValidationError } from "../validation-error.js";

describe("ValidationError", () => {
  it("should extend Error", () => {
    const err = new ValidationError("validation failed");
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("validation failed");
  });

  describe("createFrom", () => {
    it("creates ValidationError with message", () => {
      const err = ValidationError.createFrom("fail");
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.message).toBe("fail");
    });
  });
});
