// Route tests live outside src/app/: Expo Router would treat any file there as a screen.
// The user is signed in the real way: a saved refresh token is exchanged on launch (authApi.refresh is
// mocked), so the screen's getAccessToken() returns "access-1" and we can check it is sent.
import { fireEvent, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { accountApi } from "@/api/account";
import { ApiError } from "@/api/ApiError";
import { authApi } from "@/api/auth";
import { getConnectivity } from "@/api/connectivity";
import { tokenStore } from "@/auth/tokenStore";
import { tokens } from "@/test/authApiMock";
import { appRoutes } from "./routes";

jest.mock("@/api/connectivity", () => ({ getConnectivity: jest.fn() }));
jest.mock("@/api/auth", () => jest.requireActual("@/test/authApiMock").authApiMockFactory());
jest.mock("@/api/account", () => ({
  accountApi: { requestExport: jest.fn(), startDeletion: jest.fn(), confirmDeletion: jest.fn() },
}));
const auth = authApi as jest.Mocked<typeof authApi>;
const account = accountApi as jest.Mocked<typeof accountApi>;

const ACCEPTED = { requestId: "Rq12abCD", format: "READABLE" as const, sentTo: "t***@gmail.com" };

async function signedIn() {
  await tokenStore.set("refresh-1");
  auth.refresh.mockResolvedValue(tokens());
}

const emailButton = () => screen.findByRole("button", { name: "Email my data" });

beforeEach(async () => {
  jest.clearAllMocks();
  Object.values(auth).forEach((f) => f.mockReset());
  Object.values(account).forEach((f) => f.mockReset());
  auth.logout.mockResolvedValue({ loggedOut: true });
  (getConnectivity as jest.Mock).mockResolvedValue({ status: "ok", color: "绿", timestamp: "t" });
  await tokenStore.clear();
});

describe("Export my data", () => {
  it("shows a guest the log-in prompt instead of the form, and Log in opens the log-in screen", async () => {
    await renderRouter(appRoutes, { initialUrl: "/account/export" });
    expect(await screen.findByText("Log in to manage your account data.")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Email my data" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Log in" }));
    expect(screen).toHavePathname("/login");
    expect(account.requestExport).not.toHaveBeenCalled();
  });

  it("defaults to Readable and shows the info notice", async () => {
    await signedIn();
    await renderRouter(appRoutes, { initialUrl: "/account/export" });
    await emailButton();
    expect(screen.getByRole("radio", { name: /^Readable\./ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /^As HandySG stores it\./ })).not.toBeChecked();
    expect(screen.getByText("This can take a while")).toBeOnTheScreen();
  });

  it("requests a Readable export with the access token, then confirms where it was sent", async () => {
    await signedIn();
    account.requestExport.mockResolvedValue(ACCEPTED);
    await renderRouter(appRoutes, { initialUrl: "/account/export" });
    await fireEvent.press(await emailButton());
    expect(account.requestExport).toHaveBeenCalledWith("READABLE", "access-1");
    expect(await screen.findByText("Export requested")).toBeOnTheScreen();
    expect(screen.getByText(/will email it to t\*\*\*@gmail\.com/)).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Email my data" })).toBeNull();
    expect(screen.queryByRole("radio", { name: /^Readable\./ })).toBeNull();
  });

  it("sends STORED when the user picks 'As HandySG stores it'", async () => {
    await signedIn();
    account.requestExport.mockResolvedValue({ ...ACCEPTED, format: "STORED" });
    await renderRouter(appRoutes, { initialUrl: "/account/export" });
    await emailButton();
    await fireEvent.press(screen.getByRole("radio", { name: /^As HandySG stores it\./ }));
    expect(screen.getByRole("radio", { name: /^As HandySG stores it\./ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /^Readable\./ })).not.toBeChecked();
    await fireEvent.press(screen.getByRole("button", { name: "Email my data" }));
    expect(account.requestExport).toHaveBeenCalledWith("STORED", "access-1");
  });

  it("shows the rate-limit error in a notice and keeps the form so the user can retry", async () => {
    await signedIn();
    account.requestExport.mockRejectedValueOnce(new ApiError(429, "too_many_requests", "Too many requests"));
    await renderRouter(appRoutes, { initialUrl: "/account/export" });
    await fireEvent.press(await emailButton());
    expect(await screen.findByText("Couldn’t start the export")).toBeOnTheScreen();
    expect(screen.getByText("Too many attempts. Wait a few minutes and try again.")).toBeOnTheScreen();
    expect(screen.queryByText("Export requested")).toBeNull();

    account.requestExport.mockResolvedValueOnce(ACCEPTED);
    await fireEvent.press(screen.getByRole("button", { name: "Email my data" }));
    expect(await screen.findByText("Export requested")).toBeOnTheScreen();
    expect(screen.queryByText("Couldn’t start the export")).toBeNull();
  });

  it("shows other server errors as sent", async () => {
    await signedIn();
    account.requestExport.mockRejectedValueOnce(new ApiError(0, "network_error", "Can't reach HandySG. Check your connection and try again."));
    await renderRouter(appRoutes, { initialUrl: "/account/export" });
    await fireEvent.press(await emailButton());
    expect(await screen.findByText("Can't reach HandySG. Check your connection and try again.")).toBeOnTheScreen();
  });

  it("Done goes back to Profile when opened from it", async () => {
    await signedIn();
    account.requestExport.mockResolvedValue(ACCEPTED);
    await renderRouter(appRoutes, { initialUrl: "/profile" });
    await fireEvent.press(await screen.findByRole("link", { name: "Export my data" }));
    expect(screen).toHavePathname("/account/export");
    await fireEvent.press(await emailButton());
    await fireEvent.press(await screen.findByRole("button", { name: "Done" }));
    expect(screen).toHavePathname("/profile");
  });

  it("Done replaces with Profile when the page was opened with no history", async () => {
    await signedIn();
    account.requestExport.mockResolvedValue(ACCEPTED);
    await renderRouter(appRoutes, { initialUrl: "/account/export" });
    await fireEvent.press(await emailButton());
    await fireEvent.press(await screen.findByRole("button", { name: "Done" }));
    expect(screen).toHavePathname("/profile");
  });
});
