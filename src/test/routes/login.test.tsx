// Route tests live outside src/app/: Expo Router would treat any file there as a screen.
import { act, fireEvent, screen } from "@testing-library/react-native";
import { TextInput } from "react-native";
import { renderRouter } from "expo-router/testing-library";
import { ApiError } from "@/api/ApiError";
import { authApi } from "@/api/auth";
import { getConnectivity } from "@/api/connectivity";
import { tokenStore } from "@/auth/tokenStore";
import { challenge, tokens } from "@/test/authApiMock";
import { appRoutes } from "./routes";

jest.mock("@/api/connectivity", () => ({ getConnectivity: jest.fn() }));
jest.mock("@/api/auth", () => jest.requireActual("@/test/authApiMock").authApiMockFactory());
const api = authApi as jest.Mocked<typeof authApi>;

const usernameField = () => screen.getByLabelText("Username");

async function enterUsername(name: string) {
  await fireEvent.changeText(await screen.findByLabelText("Username"), name);
  await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
}

beforeEach(async () => {
  jest.clearAllMocks();
  Object.values(api).forEach((f) => f.mockReset());
  api.listAddresses.mockResolvedValue([]); // Home and Profile load saved addresses
  api.logout.mockResolvedValue({ loggedOut: true });
  (getConnectivity as jest.Mock).mockResolvedValue({ status: "ok", color: "绿", timestamp: "t" });
  await tokenStore.clear();
});

describe("Log in: username step", () => {
  it("asks for a username before calling the API", async () => {
    await renderRouter(appRoutes, { initialUrl: "/login" });
    await fireEvent.press(await screen.findByRole("button", { name: "Continue" }));
    expect(screen.getByText("Enter your username.")).toBeOnTheScreen();
    expect(api.identify).not.toHaveBeenCalled();
  });

  it("trims the username, and an existing account moves on to the password", async () => {
    api.identify.mockResolvedValue({ exists: true });
    await renderRouter(appRoutes, { initialUrl: "/login" });
    await enterUsername("  tan_ah_kow ");
    expect(api.identify).toHaveBeenCalledWith("tan_ah_kow");
    expect(await screen.findByLabelText("Password")).toBeOnTheScreen();
    expect(screen.getByText("tan_ah_kow")).toBeOnTheScreen();
    expect(screen.getByText("Enter your password. We’ll then email you a 6-digit code.")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Username")).toBeNull();
  });

  it("focuses the password field once an existing account is found", async () => {
    // The jest TextInput mock shares one focus() jest.fn on its prototype; `this` is the focused input.
    const focus = jest.spyOn(TextInput.prototype, "focus");
    try {
      api.identify.mockResolvedValue({ exists: true });
      await renderRouter(appRoutes, { initialUrl: "/login" });
      await enterUsername("tan_ah_kow");
      await screen.findByLabelText("Password");
      // login.tsx focuses it after a 50 ms delay; renderRouter turns on jest fake timers, so step the clock.
      await act(async () => {
        jest.advanceTimersByTime(49);
      });
      expect(focus).not.toHaveBeenCalled();
      await act(async () => {
        jest.advanceTimersByTime(1);
      });
      const focused = focus.mock.contexts.map((input) => (input as unknown as { props: { accessibilityLabel?: string } }).props.accessibilityLabel);
      expect(focused).toEqual(["Password"]);
    } finally {
      focus.mockRestore();
    }
  });

  it("does not move focus when the username has no account", async () => {
    const focus = jest.spyOn(TextInput.prototype, "focus");
    try {
      api.identify.mockResolvedValue({ exists: false });
      await renderRouter(appRoutes, { initialUrl: "/login" });
      await enterUsername("new_user");
      await screen.findByText(/No account called/);
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      expect(focus).not.toHaveBeenCalled();
    } finally {
      focus.mockRestore();
    }
  });

  it("shows the API's message when identify fails, and clears it on typing", async () => {
    api.identify.mockRejectedValue(new ApiError(0, "network_error", "Can't reach HandySG. Check your connection and try again."));
    await renderRouter(appRoutes, { initialUrl: "/login" });
    await enterUsername("tan");
    expect(await screen.findByText("Can't reach HandySG. Check your connection and try again.")).toBeOnTheScreen();
    await fireEvent.changeText(usernameField(), "tan2");
    expect(screen.queryByText(/Can't reach HandySG/)).toBeNull();
  });

  it("shows a friendly message when rate-limited", async () => {
    api.identify.mockRejectedValue(new ApiError(429, "too_many_requests", "Too Many Requests"));
    await renderRouter(appRoutes, { initialUrl: "/login" });
    await enterUsername("tan");
    expect(await screen.findByText("Too many attempts. Wait a few minutes and try again.")).toBeOnTheScreen();
  });
});

describe("Log in: no account", () => {
  it("offers to create an account with a valid username, carrying it to the password step", async () => {
    api.identify.mockResolvedValue({ exists: false });
    await renderRouter(appRoutes, { initialUrl: "/login" });
    await enterUsername("new_user");
    expect(await screen.findByRole("header", { name: "No account called “new_user”" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("header", { name: "Create a password" })).toBeOnTheScreen();
    expect(screen).toHavePathname("/register");
    expect(screen.getByText("new_user")).toBeOnTheScreen();
  });

  it("explains the username rules instead of offering sign-up for an invalid username", async () => {
    api.identify.mockResolvedValue({ exists: false });
    await renderRouter(appRoutes, { initialUrl: "/login" });
    await enterUsername("ab");
    expect(await screen.findByText(/pick a username of 3–30 letters/)).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Create account" })).toBeNull();
  });

  it("'Try a different username' goes back to the username field", async () => {
    api.identify.mockResolvedValue({ exists: false });
    await renderRouter(appRoutes, { initialUrl: "/login" });
    await enterUsername("new_user");
    await fireEvent.press(await screen.findByRole("button", { name: "Try a different username" }));
    expect(usernameField().props.value).toBe("new_user");
    expect(screen.queryByText(/No account called/)).toBeNull();
  });
});

describe("Log in: password step", () => {
  beforeEach(() => api.identify.mockResolvedValue({ exists: true }));

  it("asks for a password before calling the API", async () => {
    await renderRouter(appRoutes, { initialUrl: "/login" });
    await enterUsername("tan_ah_kow");
    await fireEvent.press(await screen.findByRole("button", { name: "Log in" }));
    expect(screen.getByText("Enter your password.")).toBeOnTheScreen();
    expect(api.login).not.toHaveBeenCalled();
  });

  it("explains a wrong password", async () => {
    api.login.mockRejectedValue(new ApiError(401, "invalid_login_credentials", "Invalid username or password"));
    await renderRouter(appRoutes, { initialUrl: "/login" });
    await enterUsername("tan_ah_kow");
    await fireEvent.changeText(await screen.findByLabelText("Password"), "wrong");
    await fireEvent.press(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("That password isn't right. Try again.")).toBeOnTheScreen();
    expect(screen).toHavePathname("/login");
  });

  it("'Change' goes back to the username step and forgets the password", async () => {
    await renderRouter(appRoutes, { initialUrl: "/login" });
    await enterUsername("tan_ah_kow");
    await fireEvent.changeText(await screen.findByLabelText("Password"), "secret");
    await fireEvent.press(screen.getByRole("button", { name: "Change username" }));
    expect(usernameField()).toBeOnTheScreen();
    expect(screen.queryByLabelText("Password")).toBeNull();
  });

  it("sends a correct password to the code step with where the code went", async () => {
    api.login.mockResolvedValue(challenge());
    await renderRouter(appRoutes, { initialUrl: "/login" });
    await enterUsername("tan_ah_kow");
    await fireEvent.changeText(await screen.findByLabelText("Password"), "Abcdef1!");
    await fireEvent.press(screen.getByRole("button", { name: "Log in" }));
    expect(api.login).toHaveBeenCalledWith("tan_ah_kow", "Abcdef1!");
    expect(await screen.findByRole("header", { name: "Enter your code" })).toBeOnTheScreen();
    expect(screen).toHavePathname("/verify");
    expect(screen.getByText("t***@gmail.com")).toBeOnTheScreen();
  });
});

describe("Log in: full flow", () => {
  it("from Home: username → password → code signs in and closes the modal back to Home", async () => {
    api.identify.mockResolvedValue({ exists: true });
    api.login.mockResolvedValue(challenge());
    api.verifyOtp.mockResolvedValue(tokens());
    await renderRouter(appRoutes, { initialUrl: "/" });
    await fireEvent.press(await screen.findByRole("button", { name: "Notifications" }));
    await enterUsername("tan_ah_kow");
    await fireEvent.changeText(await screen.findByLabelText("Password"), "Abcdef1!");
    await fireEvent.press(screen.getByRole("button", { name: "Log in" }));
    await fireEvent.changeText(await screen.findByLabelText("6-digit code"), "123456");
    expect(api.verifyOtp).toHaveBeenCalledWith("ch_login1", "123456");
    expect(await screen.findByText("Hi tan_ah_kow")).toBeOnTheScreen();
    expect(screen).toHavePathname("/");
    await expect(tokenStore.get()).resolves.toBe("refresh-1");
  });

  it("Log out on Profile returns to the guest view and revokes the session", async () => {
    api.identify.mockResolvedValue({ exists: true });
    api.login.mockResolvedValue(challenge());
    api.verifyOtp.mockResolvedValue(tokens());
    await renderRouter(appRoutes, { initialUrl: "/profile" });
    await fireEvent.press(await screen.findByRole("button", { name: "Log in" }));
    await enterUsername("tan_ah_kow");
    await fireEvent.changeText(await screen.findByLabelText("Password"), "Abcdef1!");
    await fireEvent.press(screen.getByRole("button", { name: "Log in" }));
    await fireEvent.changeText(await screen.findByLabelText("6-digit code"), "123456");
    expect(await screen.findByText("tan_ah_kow")).toBeOnTheScreen();
    expect(screen).toHavePathname("/profile");

    await fireEvent.press(screen.getByRole("button", { name: "Log out" }));
    expect(await screen.findByText("You're browsing as a guest")).toBeOnTheScreen();
    expect(api.logout).toHaveBeenCalledWith("refresh-1");
    await expect(tokenStore.get()).resolves.toBeNull();
  });
});

describe("Log in: after the session expired", () => {
  it("shows the expired notice and 'Log in to continue' when opened by SessionProvider", async () => {
    await renderRouter(appRoutes, { initialUrl: "/login?reason=continue&expired=1" });
    expect(await screen.findByText("Your session has expired")).toBeOnTheScreen();
    expect(screen.getByText("For your security, please log in again to continue.")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Log in to continue" })).toBeOnTheScreen();
    expect(usernameField()).toBeOnTheScreen();
  });

  it("keeps the notice on the password step", async () => {
    api.identify.mockResolvedValue({ exists: true });
    await renderRouter(appRoutes, { initialUrl: "/login?reason=continue&expired=1" });
    await enterUsername("tan_ah_kow");
    expect(await screen.findByLabelText("Password")).toBeOnTheScreen();
    expect(screen.getByText("Your session has expired")).toBeOnTheScreen();
  });

  it.each([
    ["no expired param", "/login?reason=continue"],
    ["expired=0", "/login?expired=0"],
    ["expired=true (only '1' counts)", "/login?expired=true"],
  ])("shows no notice with %s", async (_what, url) => {
    await renderRouter(appRoutes, { initialUrl: url });
    expect(await screen.findByLabelText("Username")).toBeOnTheScreen();
    expect(screen.queryByText("Your session has expired")).toBeNull();
  });

  it("a plain log-in shows neither the notice nor 'Log in to continue'", async () => {
    await renderRouter(appRoutes, { initialUrl: "/login" });
    expect(await screen.findByRole("header", { name: "Log in or sign up" })).toBeOnTheScreen();
    expect(screen.queryByText("Your session has expired")).toBeNull();
  });

  it("end to end: a signed-in call that gets a 401 and a refused refresh lands on log-in with the notice", async () => {
    const fetchMock = jest.fn();
    const realFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    try {
      // Home loads the customer's jobs through the real API client: the access token has expired.
      fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({ data: { code: "invalid_access_token", message: "Session expired" } }) });
      await tokenStore.set("refresh-0");
      api.refresh
        .mockResolvedValueOnce(tokens()) // restore on launch
        .mockRejectedValueOnce(new ApiError(401, "invalid_refresh_token", "Session expired")); // renewal refused
      await renderRouter(appRoutes, { initialUrl: "/" });
      expect(await screen.findByText("Your session has expired")).toBeOnTheScreen();
      expect(screen).toHavePathname("/login");
      expect(screen.getByRole("header", { name: "Log in to continue" })).toBeOnTheScreen();
      expect(api.refresh.mock.calls).toEqual([["refresh-0"], ["refresh-1"]]);
      await expect(tokenStore.get()).resolves.toBeNull();
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it("end to end: a renewed session retries the call and stays signed in", async () => {
    const fetchMock = jest.fn();
    const realFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    try {
      fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
        const auth = (init.headers as Record<string, string>).Authorization;
        return auth === "Bearer access-2"
          ? { ok: true, status: 200, json: async () => ({ data: [] }) }
          : { ok: false, status: 401, json: async () => ({ data: { code: "invalid_access_token", message: "Session expired" } }) };
      });
      await tokenStore.set("refresh-0");
      api.refresh.mockResolvedValueOnce(tokens()).mockResolvedValueOnce(tokens({ accessToken: "access-2", refreshToken: "refresh-2" }));
      await renderRouter(appRoutes, { initialUrl: "/" });
      expect(await screen.findByText("No jobs yet. Pick a trade above to book one.")).toBeOnTheScreen();
      expect(screen.getByText("Hi tan_ah_kow")).toBeOnTheScreen();
      expect(screen).toHavePathname("/");
      expect(screen.queryByText("Your session has expired")).toBeNull();
      await expect(tokenStore.get()).resolves.toBe("refresh-2");
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
