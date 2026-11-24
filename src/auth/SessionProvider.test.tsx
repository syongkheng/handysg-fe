import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { authApi, type AuthTokens } from "@/api/auth";
import { ApiError } from "@/api/ApiError";
import { api } from "@/api/client";
import { router } from "expo-router";
import { SessionProvider, useSession, useSessionActions, type Session } from "./SessionProvider";
import { tokenStore } from "./tokenStore";

jest.mock("@/api/auth", () => ({ authApi: { refresh: jest.fn(), logout: jest.fn() } }));
// The provider sends the user to /login when the session can't be renewed; no navigator is mounted here.
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
const push = router.push as jest.Mock;
const refresh = authApi.refresh as jest.MockedFunction<typeof authApi.refresh>;
const logout = authApi.logout as jest.MockedFunction<typeof authApi.logout>;
const store = tokenStore as jest.Mocked<typeof tokenStore>;

const tokens = (n = 1): AuthTokens => ({
  accessToken: `access-${n}`,
  accessTokenExpiresIn: 900,
  refreshToken: `refresh-${n}`,
  user: {
    id: "aZ3kP9qL",
    type: "CUSTOMER",
    username: "tan_ah_kow",
    email: "t***@gmail.com",
    emailVerified: true,
    status: "ACTIVE",
    createdAt: "2026-11-21T00:00:00.000Z",
  },
});

const SIGNED_IN_USER = { publicId: "aZ3kP9qL", username: "tan_ah_kow", type: "CUSTOMER" };

const wrapper = (initialSession?: Session) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <SessionProvider initialSession={initialSession}>{children}</SessionProvider>;
  };

const useBoth = () => ({ session: useSession(), actions: useSessionActions() });

beforeEach(async () => {
  await store.clear();
  jest.clearAllMocks();
  refresh.mockReset();
  logout.mockReset();
  logout.mockResolvedValue({ loggedOut: true });
});

describe("SessionProvider restore on launch", () => {
  it("stays a guest without calling the API when no refresh token is saved", async () => {
    const { result } = await renderHook(useBoth, { wrapper: wrapper() });
    await waitFor(() => expect(store.get).toHaveBeenCalled());
    expect(refresh).not.toHaveBeenCalled();
    expect(result.current.session).toEqual({ status: "guest" });
    expect(result.current.actions.getAccessToken()).toBeNull();
  });

  it("exchanges a saved refresh token, signs in, and stores the rotated token", async () => {
    await store.set("saved-refresh");
    refresh.mockResolvedValue(tokens(2));
    const { result } = await renderHook(useBoth, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.session.status).toBe("signedIn"));
    expect(refresh).toHaveBeenCalledWith("saved-refresh");
    expect(result.current.session).toEqual({ status: "signedIn", user: SIGNED_IN_USER });
    expect(result.current.actions.getAccessToken()).toBe("access-2");
    await expect(store.get()).resolves.toBe("refresh-2");
  });

  it("stays a guest when the saved token is rejected", async () => {
    await store.set("revoked");
    refresh.mockRejectedValue(new ApiError(401, "invalid_refresh_token", "Session expired"));
    const { result } = await renderHook(useBoth, { wrapper: wrapper() });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    await act(async () => {});
    expect(result.current.session).toEqual({ status: "guest" });
    expect(result.current.actions.getAccessToken()).toBeNull();
  });

  it("skips the restore when an initial session is given", async () => {
    await store.set("saved-refresh");
    const initial: Session = { status: "signedIn", user: { publicId: "x", username: "u", type: "CUSTOMER" } };
    const { result } = await renderHook(useBoth, { wrapper: wrapper(initial) });
    await act(async () => {});
    expect(store.get).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(result.current.session).toEqual(initial);
  });
});

describe("signIn / signOut", () => {
  it("signIn keeps the access token in memory and the refresh token in the store", async () => {
    const { result } = await renderHook(useBoth, { wrapper: wrapper({ status: "guest" }) });
    await act(() => result.current.actions.signIn(tokens(1)));
    expect(result.current.session).toEqual({ status: "signedIn", user: SIGNED_IN_USER });
    expect(result.current.actions.getAccessToken()).toBe("access-1");
    expect(store.set).toHaveBeenCalledWith("refresh-1");
  });

  it("signOut forgets the tokens, becomes a guest and revokes the refresh token on the server", async () => {
    const { result } = await renderHook(useBoth, { wrapper: wrapper({ status: "guest" }) });
    await act(() => result.current.actions.signIn(tokens(1)));
    await act(() => result.current.actions.signOut());
    expect(result.current.session).toEqual({ status: "guest" });
    expect(result.current.actions.getAccessToken()).toBeNull();
    await expect(store.get()).resolves.toBeNull();
    expect(logout).toHaveBeenCalledWith("refresh-1");
  });

  it("signOut still signs out locally when the server call fails (offline)", async () => {
    logout.mockRejectedValue(new ApiError(0, "network_error", "offline"));
    const { result } = await renderHook(useBoth, { wrapper: wrapper({ status: "guest" }) });
    await act(() => result.current.actions.signIn(tokens(1)));
    await act(() => result.current.actions.signOut());
    expect(result.current.session).toEqual({ status: "guest" });
    await expect(store.get()).resolves.toBeNull();
  });

  it("signOut without a saved token doesn't call the server", async () => {
    const { result } = await renderHook(useBoth, { wrapper: wrapper({ status: "guest" }) });
    await act(() => result.current.actions.signOut());
    expect(logout).not.toHaveBeenCalled();
    expect(result.current.session).toEqual({ status: "guest" });
  });
});

describe("renewing an expired access token (API client 401)", () => {
  // The real API client runs; only fetch is mocked. The provider's recovery is what the client calls on a 401.
  const fetchMock = jest.fn();
  const respond = (status: number, body: unknown) =>
    fetchMock.mockResolvedValueOnce({ ok: status >= 200 && status < 300, status, json: async () => body });
  const unauthorized = () => respond(401, { data: { code: "invalid_access_token", message: "Session expired" } });
  const EXPIRED_LOGIN = { pathname: "/login", params: { reason: "continue", expired: "1" } };

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  /** Restores a session on launch (refresh-1 → access-1) and waits until signed in. */
  async function signedIn() {
    await store.set("refresh-0");
    refresh.mockResolvedValueOnce(tokens(1));
    const hook = await renderHook(useBoth, { wrapper: wrapper() });
    await waitFor(() => expect(hook.result.current.session.status).toBe("signedIn"));
    refresh.mockClear();
    return hook;
  }

  const deferred = <T,>() => {
    let resolve!: (v: T) => void;
    let reject!: (e: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };

  it("refreshes with the saved token, stores the rotated one and retries the call with the new access token", async () => {
    const { result } = await signedIn();
    refresh.mockResolvedValueOnce(tokens(2));
    unauthorized();
    respond(200, { data: ["job"] });
    let data: unknown;
    await act(async () => {
      data = await api.get("/jobs", { token: "access-1" });
    });
    expect(data).toEqual(["job"]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith("refresh-1");
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer access-2");
    expect(result.current.actions.getAccessToken()).toBe("access-2");
    await expect(store.get()).resolves.toBe("refresh-2");
    expect(result.current.session).toEqual({ status: "signedIn", user: SIGNED_IN_USER });
    expect(push).not.toHaveBeenCalled();
  });

  it("shares one refresh between calls that expire together (single-flight)", async () => {
    await signedIn();
    const pending = deferred<AuthTokens>();
    refresh.mockReturnValueOnce(pending.promise);
    unauthorized();
    unauthorized();
    respond(200, { data: "a" });
    respond(200, { data: "b" });
    let results: unknown[] = [];
    await act(async () => {
      const both = Promise.all([api.get("/a", { token: "access-1" }), api.get("/b", { token: "access-1" })]);
      await waitFor(() => expect(refresh).toHaveBeenCalled());
      pending.resolve(tokens(2));
      results = await both;
    });
    expect(results).toEqual(["a", "b"]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls.slice(2).map((c) => c[1].headers.Authorization)).toEqual(["Bearer access-2", "Bearer access-2"]);
  });

  it("a late 401 for a token that was already renewed reuses the current token without refreshing again", async () => {
    const { result } = await signedIn();
    refresh.mockResolvedValueOnce(tokens(2));
    unauthorized();
    respond(200, { data: "first" });
    await act(async () => {
      await api.get("/a", { token: "access-1" });
    });
    // A call that was sent with access-1 before the renewal comes back 401 afterwards.
    unauthorized();
    respond(200, { data: "late" });
    let late: unknown;
    await act(async () => {
      late = await api.get("/b", { token: "access-1" });
    });
    expect(late).toBe("late");
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[3][1].headers.Authorization).toBe("Bearer access-2");
    expect(result.current.actions.getAccessToken()).toBe("access-2");
  });

  it("refreshes again on a later expiry (the single-flight slot is released)", async () => {
    await signedIn();
    refresh.mockResolvedValueOnce(tokens(2)).mockResolvedValueOnce(tokens(3));
    unauthorized();
    respond(200, { data: 1 });
    unauthorized();
    respond(200, { data: 2 });
    await act(async () => {
      await api.get("/a", { token: "access-1" });
      await api.get("/a", { token: "access-2" });
    });
    expect(refresh.mock.calls).toEqual([["refresh-1"], ["refresh-2"]]);
    expect(fetchMock.mock.calls[3][1].headers.Authorization).toBe("Bearer access-3");
  });

  it.each([
    ["401 (expired or revoked)", 401],
    ["403 (account suspended)", 403],
    ["404 (account deleted)", 404],
  ])("a refresh refused with %s signs out and opens log-in with the expired notice", async (_what, status) => {
    const { result } = await signedIn();
    refresh.mockRejectedValueOnce(new ApiError(status, "invalid_refresh_token", "Session expired"));
    unauthorized();
    let err: unknown;
    await act(async () => {
      err = await api.get("/jobs", { token: "access-1" }).catch((e) => e);
    });
    expect(err).toMatchObject({ httpStatus: 401, code: "invalid_access_token" });
    expect(fetchMock).toHaveBeenCalledTimes(1); // no retry
    expect(result.current.session).toEqual({ status: "guest" });
    expect(result.current.actions.getAccessToken()).toBeNull();
    await expect(store.get()).resolves.toBeNull();
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(EXPIRED_LOGIN);
  });

  it.each([
    ["a network error", new ApiError(0, "network_error", "offline")],
    ["a timeout", new ApiError(0, "timeout", "slow")],
    ["a 500", new ApiError(500, "server_error", "Something went wrong")],
    ["a 503", new ApiError(503, "bad_response", "Something went wrong")],
    ["a non-API error", new Error("secure store hiccup")],
  ])("%s while refreshing keeps the user signed in and passes the 401 to the caller", async (_what, failure) => {
    const { result } = await signedIn();
    refresh.mockRejectedValueOnce(failure);
    unauthorized();
    let err: unknown;
    await act(async () => {
      err = await api.get("/jobs", { token: "access-1" }).catch((e) => e);
    });
    expect(err).toMatchObject({ httpStatus: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.session).toEqual({ status: "signedIn", user: SIGNED_IN_USER });
    expect(result.current.actions.getAccessToken()).toBe("access-1");
    await expect(store.get()).resolves.toBe("refresh-1");
    expect(push).not.toHaveBeenCalled();
  });

  it("can renew on the next call after a failed (offline) attempt", async () => {
    await signedIn();
    refresh.mockRejectedValueOnce(new ApiError(0, "network_error", "offline")).mockResolvedValueOnce(tokens(2));
    unauthorized();
    unauthorized();
    respond(200, { data: "ok" });
    let second: unknown;
    await act(async () => {
      await api.get("/jobs", { token: "access-1" }).catch(() => {});
      second = await api.get("/jobs", { token: "access-1" });
    });
    expect(second).toBe("ok");
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("with no saved refresh token, signs out and opens log-in without calling the API", async () => {
    const { result } = await signedIn();
    await store.clear();
    unauthorized();
    await act(async () => {
      await api.get("/jobs", { token: "access-1" }).catch(() => {});
    });
    expect(refresh).not.toHaveBeenCalled();
    expect(result.current.session).toEqual({ status: "guest" });
    expect(push).toHaveBeenCalledWith(EXPIRED_LOGIN);
  });

  it("calls that expire together and fail to renew open log-in only once", async () => {
    await signedIn();
    const pending = deferred<AuthTokens>();
    refresh.mockReturnValueOnce(pending.promise);
    unauthorized();
    unauthorized();
    await act(async () => {
      const both = Promise.allSettled([api.get("/a", { token: "access-1" }), api.get("/b", { token: "access-1" })]);
      await waitFor(() => expect(refresh).toHaveBeenCalled());
      pending.reject(new ApiError(401, "invalid_refresh_token", "Session expired"));
      await both;
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledTimes(1);
  });

  it("a call that comes back 401 after the session already expired doesn't open log-in a second time", async () => {
    await signedIn();
    refresh.mockRejectedValueOnce(new ApiError(401, "invalid_refresh_token", "Session expired"));
    unauthorized();
    await act(async () => {
      await api.get("/a", { token: "access-1" }).catch(() => {});
    });
    expect(push).toHaveBeenCalledTimes(1);
    // A second call sent with access-1 before the expiry answers 401 only now.
    unauthorized();
    let err: unknown;
    await act(async () => {
      err = await api.get("/b", { token: "access-1" }).catch((e) => e);
    });
    expect(err).toMatchObject({ httpStatus: 401 });
    expect(push).toHaveBeenCalledTimes(1);
  });

  it("isn't registered when an initial session is given: the 401 goes straight to the caller", async () => {
    await store.set("refresh-1");
    await renderHook(useBoth, { wrapper: wrapper({ status: "guest" }) });
    unauthorized();
    let err: unknown;
    await act(async () => {
      err = await api.get("/jobs", { token: "access-1" }).catch((e) => e);
    });
    expect(err).toMatchObject({ httpStatus: 401 });
    expect(refresh).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("is unregistered when the provider unmounts", async () => {
    const { unmount } = await signedIn();
    await act(async () => unmount());
    unauthorized();
    let err: unknown;
    await act(async () => {
      err = await api.get("/jobs", { token: "access-1" }).catch((e) => e);
    });
    expect(err).toMatchObject({ httpStatus: 401 });
    expect(refresh).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
