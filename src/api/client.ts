import { env } from "@/config/env";
import { ApiError, CLIENT_ERROR } from "./ApiError";

/** Every backend response, success or failure, arrives as { code, status, data } (ControllerResponse). */
export interface ApiEnvelope<T> {
  code: number;
  status: string;
  data: T;
}

/** `data` on a 4xx (BaseException.toResponseMessage on the backend). */
interface ErrorBody {
  code: string;
  message: string;
  fieldName?: string;
}

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface RequestOptions {
  body?: unknown;
  /** Defaults to 15 s. Slow mobile networks are common; don't go much lower. */
  timeoutMs?: number;
  /** Lets a screen cancel the request when it unmounts. */
  signal?: AbortSignal;
  /** Overrides env.apiUrl (tests). */
  baseUrl?: string;
  /** Access token for endpoints that need a signed-in user (sent as a Bearer token). */
  token?: string | null;
}

export const DEFAULT_TIMEOUT_MS = 15_000;

const MESSAGES = {
  network: "Can't reach HandySG. Check your connection and try again.",
  timeout: "HandySG is taking too long to respond. Try again.",
  badResponse: "Something went wrong. Try again.",
} as const;

const isErrorBody = (v: unknown): v is ErrorBody =>
  typeof v === "object" && v !== null && typeof (v as ErrorBody).code === "string" && typeof (v as ErrorBody).message === "string";

/**
 * Calls the HandySG API and returns the envelope's `data`. Any non-2xx answer, network failure
 * or timeout throws an ApiError with a message the UI can show as is.
 *
 *   const stats = await api.get<Connectivity>("/connectivity");
 */
export async function request<T>(method: HttpMethod, path: string, opts: RequestOptions = {}): Promise<T> {
  const url = `${opts.baseUrl ?? env.apiUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const onCallerAbort = () => controller.abort();
  opts.signal?.addEventListener("abort", onCallerAbort);
  // An already-aborted signal never fires "abort", so cancel up front instead of sending the request.
  if (opts.signal?.aborted) controller.abort();

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    // The caller cancelled on purpose: let it see the abort, not a fake network error.
    if (opts.signal?.aborted) throw err;
    if (timedOut) throw new ApiError(0, CLIENT_ERROR.timeout, MESSAGES.timeout);
    throw new ApiError(0, CLIENT_ERROR.network, MESSAGES.network);
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onCallerAbort);
  }

  let envelope: ApiEnvelope<unknown> | undefined;
  try {
    envelope = (await res.json()) as ApiEnvelope<unknown>;
  } catch {
    envelope = undefined;
  }

  if (res.ok) {
    if (!envelope || typeof envelope !== "object" || !("data" in envelope)) {
      throw new ApiError(res.status, CLIENT_ERROR.badResponse, MESSAGES.badResponse);
    }
    return envelope.data as T;
  }

  const data = envelope?.data;
  if (isErrorBody(data)) throw new ApiError(res.status, data.code, data.message, data.fieldName);
  // 500s carry a generic, already user-safe string from the backend.
  if (res.status >= 500 && typeof data === "string" && data) throw new ApiError(res.status, CLIENT_ERROR.server, data);
  throw new ApiError(res.status, CLIENT_ERROR.badResponse, MESSAGES.badResponse);
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "body">) => request<T>("GET", path, opts),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body">) => request<T>("POST", path, { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body">) => request<T>("PATCH", path, { ...opts, body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, "body">) => request<T>("DELETE", path, opts),
};
