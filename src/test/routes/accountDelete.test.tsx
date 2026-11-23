// Route tests live outside src/app/: Expo Router would treat any file there as a screen.
// The user is signed in the real way: a saved refresh token is exchanged on launch (authApi.refresh is
// mocked), so the screen's getAccessToken() returns "access-1" and we can check it is sent.
// The 60 s resend cooldown runs on fake timers in accountDeleteResend.test.tsx.
import { fireEvent, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { renderRouter } from "expo-router/testing-library";
import { accountApi } from "@/api/account";
import { ApiError } from "@/api/ApiError";
import { authApi } from "@/api/auth";
import { getConnectivity } from "@/api/connectivity";
import { tokenStore } from "@/auth/tokenStore";
import { challenge, tokens } from "@/test/authApiMock";
import { color } from "@/theme/tokens.generated";
import { appRoutes } from "./routes";

jest.mock("@/api/connectivity", () => ({ getConnectivity: jest.fn() }));
jest.mock("@/api/auth", () => jest.requireActual("@/test/authApiMock").authApiMockFactory());
jest.mock("@/api/account", () => ({
  accountApi: { requestExport: jest.fn(), startDeletion: jest.fn(), confirmDeletion: jest.fn() },
}));
const auth = authApi as jest.Mocked<typeof authApi>;
const account = accountApi as jest.Mocked<typeof accountApi>;

const DELETE_CHALLENGE = challenge({ challengeId: "ch_del1", sentTo: "t***@gmail.com" });

async function signedIn() {
  await tokenStore.set("refresh-1");
  auth.refresh.mockResolvedValue(tokens());
}

async function openDialog() {
  await fireEvent.press(await screen.findByRole("button", { name: "Delete my account" }));
}

async function toPassword() {
  await openDialog();
  await fireEvent.press(screen.getByRole("button", { name: "Yes, continue" }));
  await screen.findByRole("header", { name: "Confirm it’s you" });
}

async function toCode() {
  account.startDeletion.mockResolvedValueOnce(DELETE_CHALLENGE);
  await toPassword();
  await fireEvent.changeText(screen.getByLabelText("Password"), "S3cret!pass");
  await fireEvent.press(screen.getByRole("button", { name: "Send code" }));
  await screen.findByRole("header", { name: "Enter the code" });
}

const confirmButton = () => screen.getByRole("button", { name: "Delete my account permanently" });

beforeEach(async () => {
  jest.clearAllMocks();
  Object.values(auth).forEach((f) => f.mockReset());
  auth.listAddresses.mockResolvedValue([]); // Profile loads saved addresses
  Object.values(account).forEach((f) => f.mockReset());
  auth.logout.mockResolvedValue({ loggedOut: true });
  (getConnectivity as jest.Mock).mockResolvedValue({ status: "ok", color: "绿", timestamp: "t" });
  await tokenStore.clear();
});

describe("Profile: Your data", () => {
  it("shows Export my data and a danger-toned Delete account for a signed-in user", async () => {
    await signedIn();
    await renderRouter(appRoutes, { initialUrl: "/profile" });
    expect(await screen.findByRole("header", { name: "Your data" })).toBeOnTheScreen();
    expect(screen.getByRole("link", { name: "Export my data" })).toBeOnTheScreen();
    expect(StyleSheet.flatten(screen.getByText("Delete account").props.style).color).toBe(color.light.danger);
    expect(StyleSheet.flatten(screen.getByText("Export my data").props.style).color).toBe(color.light.text);
    await fireEvent.press(screen.getByRole("link", { name: "Delete account" }));
    expect(screen).toHavePathname("/account/delete");
  });

  it("is not shown to guests", async () => {
    await renderRouter(appRoutes, { initialUrl: "/profile" });
    expect(await screen.findByText("You're browsing as a guest")).toBeOnTheScreen();
    expect(screen.queryByRole("link", { name: "Delete account" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Export my data" })).toBeNull();
  });
});

describe("Delete account", () => {
  it("shows a guest the log-in prompt instead of the flow", async () => {
    await renderRouter(appRoutes, { initialUrl: "/account/delete" });
    expect(await screen.findByText("Log in to manage your account data.")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Delete my account" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Log in" }));
    expect(screen).toHavePathname("/login");
  });

  it("reviews what gets deleted and links to the export page", async () => {
    await signedIn();
    await renderRouter(appRoutes, { initialUrl: "/account/delete" });
    expect(await screen.findByText("Delete your account?")).toBeOnTheScreen();
    expect(screen.getByText("What gets deleted")).toBeOnTheScreen();
    expect(screen.getByText("Your saved addresses")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Export my data" }));
    expect(screen).toHavePathname("/account/export");
  });

  it("asks for confirmation in a dialog; Cancel closes it and stays on review", async () => {
    await signedIn();
    await renderRouter(appRoutes, { initialUrl: "/account/delete" });
    await openDialog();
    expect(screen.getByRole("header", { name: "Are you sure?" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Are you sure?")).toBeNull();
    expect(screen.getByText("Delete your account?")).toBeOnTheScreen();
    expect(account.startDeletion).not.toHaveBeenCalled();
  });

  it("asks for a password before sending a code", async () => {
    await signedIn();
    await renderRouter(appRoutes, { initialUrl: "/account/delete" });
    await toPassword();
    expect(screen.queryByText("Are you sure?")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Send code" }));
    expect(await screen.findByText("Enter your password.")).toBeOnTheScreen();
    expect(account.startDeletion).not.toHaveBeenCalled();
  });

  it("shows a friendly error for a wrong password and lets the user retry", async () => {
    await signedIn();
    account.startDeletion.mockRejectedValueOnce(new ApiError(401, "incorrect_password", "Incorrect password"));
    await renderRouter(appRoutes, { initialUrl: "/account/delete" });
    await toPassword();
    await fireEvent.changeText(screen.getByLabelText("Password"), "wrong");
    await fireEvent.press(screen.getByRole("button", { name: "Send code" }));
    expect(account.startDeletion).toHaveBeenCalledWith("wrong", "access-1");
    expect(await screen.findByText("That password isn’t right.")).toBeOnTheScreen();
    // Typing again clears the error.
    await fireEvent.changeText(screen.getByLabelText("Password"), "wrong2");
    expect(screen.queryByText("That password isn’t right.")).toBeNull();
  });

  it("shows the rate-limit message from startDeletion", async () => {
    await signedIn();
    account.startDeletion.mockRejectedValueOnce(new ApiError(429, "too_many_requests", "Too many"));
    await renderRouter(appRoutes, { initialUrl: "/account/delete" });
    await toPassword();
    await fireEvent.changeText(screen.getByLabelText("Password"), "S3cret!pass");
    await fireEvent.press(screen.getByRole("button", { name: "Send code" }));
    expect(await screen.findByText("Too many attempts. Wait a few minutes and try again.")).toBeOnTheScreen();
  });

  it("sends the code, shows where, and keeps the red button disabled until 6 digits (no auto-submit)", async () => {
    await signedIn();
    await renderRouter(appRoutes, { initialUrl: "/account/delete" });
    await toCode();
    expect(account.startDeletion).toHaveBeenCalledWith("S3cret!pass", "access-1");
    expect(screen.getByText("t***@gmail.com")).toBeOnTheScreen();
    expect(confirmButton()).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText("6-digit code"), "12345");
    expect(confirmButton()).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText("6-digit code"), "123456");
    expect(confirmButton()).toBeEnabled();
    expect(account.confirmDeletion).not.toHaveBeenCalled();
    // The cooldown is running, so there is no resend link yet.
    expect(screen.getByText("Didn’t get it? Send a new code in 60s")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Send a new code" })).toBeNull();
  });

  it("on a wrong code shows the error, clears the boxes, and typing again clears the error", async () => {
    await signedIn();
    account.confirmDeletion.mockRejectedValueOnce(new ApiError(400, "otp_invalid", "Invalid code"));
    await renderRouter(appRoutes, { initialUrl: "/account/delete" });
    await toCode();
    await fireEvent.changeText(screen.getByLabelText("6-digit code"), "000000");
    await fireEvent.press(confirmButton());
    expect(account.confirmDeletion).toHaveBeenCalledWith("ch_del1", "000000", "access-1");
    expect(await screen.findByRole("alert", { name: "That code is wrong or has expired. Try again, or send a new one." })).toBeOnTheScreen();
    expect(screen.getByLabelText("6-digit code").props.value).toBe("");
    expect(confirmButton()).toBeDisabled();
    expect(auth.logout).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText("6-digit code"), "1");
    expect(screen.queryByText("That code is wrong or has expired. Try again, or send a new one.")).toBeNull();
  });

  it("deletes the account, signs out, and Back to Home lands on a guest Home", async () => {
    await signedIn();
    account.confirmDeletion.mockResolvedValueOnce({ deleted: true });
    await renderRouter(appRoutes, { initialUrl: "/account/delete" });
    await toCode();
    await fireEvent.changeText(screen.getByLabelText("6-digit code"), "123456");
    await fireEvent.press(confirmButton());
    expect(account.confirmDeletion).toHaveBeenCalledWith("ch_del1", "123456", "access-1");
    expect(await screen.findByText("Your account has been deleted")).toBeOnTheScreen();
    expect(screen.queryByText("Log in to manage your account data.")).toBeNull();
    // signOut cleared the saved refresh token on this device.
    expect(tokenStore.clear).toHaveBeenCalled();
    await expect(tokenStore.get()).resolves.toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Back to Home" }));
    expect(screen).toHavePathname("/");
    expect(await screen.findByText("Hi there")).toBeOnTheScreen();
  });
});
