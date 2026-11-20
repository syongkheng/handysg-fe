/**
 * Every failed API call becomes an ApiError, so screens handle one shape.
 *
 * `code` is the backend's stable error code (e.g. "invalid_login_credentials", "otp_invalid"),
 * or one of the client-side codes below when the request never got a proper answer.
 * `message` is safe to show the user.
 */
export const CLIENT_ERROR = {
  network: "network_error",
  timeout: "timeout",
  badResponse: "bad_response",
  server: "server_error",
} as const;

export class ApiError extends Error {
  constructor(
    /** HTTP status, or 0 when no response arrived (offline, timeout). */
    public readonly httpStatus: number,
    public readonly code: string,
    message: string,
    /** The request field the error is about, when the backend names one (validation errors). */
    public readonly fieldName?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isNetworkError(): boolean {
    return this.httpStatus === 0;
  }
}
