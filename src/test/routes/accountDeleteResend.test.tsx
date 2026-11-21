// Route tests live outside src/app/: Expo Router would treat any file there as a screen.
// Its own file because it runs on fake timers for the whole file (see verifyResend.test.tsx).
import { act, fireEvent, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { accountApi } from "@/api/account";
import { ApiError } from "@/api/ApiError";
import { authApi } from "@/api/auth";
import { getConnectivity } from "@/api/connectivity";
import { tokenStore } from "@/auth/tokenStore";
import { challenge, tokens } from "@/test/authApiMock";
import { appRoutes } from "./routes";

jest.useFakeTimers();
jest.mock("@/api/connectivity", () => ({ getConnectivity: jest.fn() }));
jest.mock("@/api/auth", () => jest.requireActual("@/test/authApiMock").authApiMockFactory());
jest.mock("@/api/account", () => ({
  accountApi: { requestExport: jest.fn(), startDeletion: jest.fn(), confirmDeletion: jest.fn() },
}));
const auth = authApi as jest.Mocked<typeof authApi>;
const account = accountApi as jest.Mocked<typeof accountApi>;

const tick = () =>
  act(async () => {
    jest.advanceTimersByTime(1000);
  });

async function toCode() {
  await tokenStore.set("refresh-1");
  auth.refresh.mockResolvedValue(tokens());
  account.startDeletion.mockResolvedValueOnce(challenge({ challengeId: "ch_del1", sentTo: "t***@gmail.com" }));
  await renderRouter(appRoutes, { initialUrl: "/account/delete" });
  await fireEvent.press(await screen.findByRole("button", { name: "Delete my account" }));
  await fireEvent.press(screen.getByRole("button", { name: "Yes, continue" }));
  await fireEvent.changeText(await screen.findByLabelText("Password"), "S3cret!pass");
  await fireEvent.press(screen.getByRole("button", { name: "Send code" }));
  expect(await screen.findByText("Didn’t get it? Send a new code in 60s")).toBeOnTheScreen();
}

beforeEach(async () => {
  Object.values(auth).forEach((f) => f.mockReset());
  Object.values(account).forEach((f) => f.mockReset());
  auth.logout.mockResolvedValue({ loggedOut: true });
  (getConnectivity as jest.Mock).mockResolvedValue({ status: "ok", color: "绿", timestamp: "t" });
  await tokenStore.clear();
});

describe("Delete account: resend", () => {
  it("waits 60 s, resends via authApi.resendOtp, clears the boxes, and confirms against the new challenge", async () => {
    auth.resendOtp.mockResolvedValue(challenge({ challengeId: "ch_del2", sentTo: "t***@gmail.com" }));
    account.confirmDeletion.mockResolvedValue({ deleted: true });
    await toCode();
    await fireEvent.changeText(screen.getByLabelText("6-digit code"), "111");

    for (let i = 0; i < 59; i++) await tick();
    expect(screen.getByText("Didn’t get it? Send a new code in 1s")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Send a new code" })).toBeNull();
    await tick();

    await fireEvent.press(screen.getByRole("button", { name: "Send a new code" }));
    expect(auth.resendOtp).toHaveBeenCalledWith("ch_del1");
    expect(await screen.findByText("Didn’t get it? Send a new code in 60s")).toBeOnTheScreen();
    expect(screen.getByLabelText("6-digit code").props.value).toBe("");

    await fireEvent.changeText(screen.getByLabelText("6-digit code"), "654321");
    await fireEvent.press(screen.getByRole("button", { name: "Delete my account permanently" }));
    expect(account.confirmDeletion).toHaveBeenCalledWith("ch_del2", "654321", "access-1");
  });

  it("shows the error when resending fails and keeps the link available", async () => {
    auth.resendOtp.mockRejectedValueOnce(new ApiError(429, "too_many_requests", "Too many"));
    await toCode();
    for (let i = 0; i < 60; i++) await tick();
    await fireEvent.press(screen.getByRole("button", { name: "Send a new code" }));
    expect(await screen.findByText("Too many attempts. Wait a few minutes and try again.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Send a new code" })).toBeOnTheScreen();
  });
});
