import { ApiError } from "@/api/ApiError";

/** A message for an auth API failure that's safe and useful to show as is. */
export function authErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === "too_many_requests") return "Too many attempts. Wait a few minutes and try again.";
    return e.message;
  }
  return "Something went wrong. Try again.";
}
