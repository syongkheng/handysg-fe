import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { authApi, type AuthTokens } from "@/api/auth";
import { ApiError } from "@/api/ApiError";
import { SessionProvider, useSession, useSessionActions, type Session } from "./SessionProvider";
import { tokenStore } from "./tokenStore";

jest.mock("@/api/auth", () => ({ authApi: { refresh: jest.fn(), logout: jest.fn() } }));
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
