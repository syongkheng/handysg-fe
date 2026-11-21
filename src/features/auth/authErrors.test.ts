import { ApiError } from "@/api/ApiError";
import { authErrorMessage } from "./authErrors";

describe("authErrorMessage", () => {
  it("passes an ApiError's message through", () => {
    expect(authErrorMessage(new ApiError(400, "invalid_request", "Username is required"))).toBe("Username is required");
  });

  it("replaces the rate-limit message with a friendly one", () => {
    expect(authErrorMessage(new ApiError(429, "too_many_requests", "raw"))).toBe("Too many attempts. Wait a few minutes and try again.");
  });

  it("never shows a non-API error's message", () => {
    expect(authErrorMessage(new Error("TypeError: x is undefined"))).toBe("Something went wrong. Try again.");
  });
});
