import { renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { SessionProvider, useSession, type Session } from "./SessionProvider";
import { useRequireAuth } from "./useRequireAuth";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));

const withSession = (session?: Session) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return session ? <SessionProvider initialSession={session}>{children}</SessionProvider> : <SessionProvider>{children}</SessionProvider>;
  };

describe("useSession", () => {
  it("is a guest with no provider and with a default provider", async () => {
    expect((await renderHook(() => useSession())).result.current).toEqual({ status: "guest" });
    expect((await renderHook(() => useSession(), { wrapper: withSession() })).result.current).toEqual({ status: "guest" });
  });
});

describe("useRequireAuth", () => {
  beforeEach(() => mockPush.mockReset());

  it("sends a guest to /login with the reason and does not run the action", async () => {
    const action = jest.fn();
    const { result } = await renderHook(() => useRequireAuth(), { wrapper: withSession() });
    result.current("book a plumber", action);
    expect(action).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/login", params: { reason: "book a plumber" } });
  });

  it("runs the action for a signed-in user without navigating", async () => {
    const action = jest.fn();
    const session: Session = { status: "signedIn", user: { publicId: "aZ3kP9qL", username: "u", type: "CUSTOMER" } };
    const { result } = await renderHook(() => useRequireAuth(), { wrapper: withSession(session) });
    result.current("book a plumber", action);
    expect(action).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
