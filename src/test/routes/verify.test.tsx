// Route tests live outside src/app/: Expo Router would treat any file there as a screen.
import { fireEvent, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { ApiError } from "@/api/ApiError";
import { authApi } from "@/api/auth";
import { getConnectivity } from "@/api/connectivity";
import { tokenStore } from "@/auth/tokenStore";
import { tokens } from "@/test/authApiMock";
import { appRoutes } from "./routes";

jest.mock("@/api/connectivity", () => ({ getConnectivity: jest.fn() }));
jest.mock("@/api/auth", () => jest.requireActual("@/test/authApiMock").authApiMockFactory());
const api = authApi as jest.Mocked<typeof authApi>;

const LOGIN_URL = "/verify?challengeId=ch_login1&sentTo=t***%40gmail.com&purpose=LOGIN";
const REGISTER_URL = "/verify?challengeId=ch_reg1&sentTo=n***%40gmail.com&purpose=VERIFY_EMAIL&flow=register";
const codeInput = () => screen.findByLabelText("6-digit code");

beforeEach(async () => {
  Object.values(api).forEach((f) => f.mockReset());
  (getConnectivity as jest.Mock).mockResolvedValue({ status: "ok", color: "绿", timestamp: "t" });
  await tokenStore.clear();
});

describe("Verify (log-in)", () => {
  it("shows where the code went and keeps Verify disabled until all 6 digits are in", async () => {
    await renderRouter(appRoutes, { initialUrl: LOGIN_URL });
    expect(await screen.findByRole("header", { name: "Enter your code" })).toBeOnTheScreen();
    expect(screen.getByText("t***@gmail.com")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Verify" })).toBeDisabled();
    await fireEvent.changeText(await codeInput(), "12345");
    expect(screen.getByRole("button", { name: "Verify" })).toBeDisabled();
    expect(api.verifyOtp).not.toHaveBeenCalled();
  });

  it("a correct code signs in and closes the flow (home, when opened from a link)", async () => {
    api.verifyOtp.mockResolvedValue(tokens());
    await renderRouter(appRoutes, { initialUrl: LOGIN_URL });
    await fireEvent.changeText(await codeInput(), "123456");
    expect(api.verifyOtp).toHaveBeenCalledTimes(1);
    expect(api.verifyOtp).toHaveBeenCalledWith("ch_login1", "123456");
    expect(await screen.findByText("Hi tan_ah_kow")).toBeOnTheScreen();
    expect(screen).toHavePathname("/");
  });

  it("a wrong code shows an error and empties the boxes for another try", async () => {
    api.verifyOtp.mockRejectedValueOnce(new ApiError(400, "otp_invalid", "Invalid code"));
    await renderRouter(appRoutes, { initialUrl: LOGIN_URL });
    await fireEvent.changeText(await codeInput(), "111111");
    expect(await screen.findByText("That code is wrong or has expired. Try again, or send a new one.")).toBeOnTheScreen();
    expect((await codeInput()).props.value).toBe("");
    expect(screen).toHavePathname("/verify");

    // Typing again clears the error, and the next try goes through.
    api.verifyOtp.mockResolvedValueOnce(tokens());
    await fireEvent.changeText(await codeInput(), "2");
    expect(screen.queryByText(/That code is wrong/)).toBeNull();
    await fireEvent.changeText(await codeInput(), "222222");
    expect(api.verifyOtp).toHaveBeenLastCalledWith("ch_login1", "222222");
    expect(await screen.findByText("Hi tan_ah_kow")).toBeOnTheScreen();
  });

  it("shows other API errors as they are", async () => {
    api.verifyOtp.mockRejectedValue(new ApiError(0, "network_error", "Can't reach HandySG. Check your connection and try again."));
    await renderRouter(appRoutes, { initialUrl: LOGIN_URL });
    await fireEvent.changeText(await codeInput(), "123456");
    expect(await screen.findByText("Can't reach HandySG. Check your connection and try again.")).toBeOnTheScreen();
  });

  it("explains an expired request when opened without a challenge, and links to log-in", async () => {
    await renderRouter(appRoutes, { initialUrl: "/verify" });
    expect(await screen.findByText("This code request has expired. Log in again to get a new code.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Go to log in" }));
    expect(await screen.findByRole("header", { name: "Log in or sign up" })).toBeOnTheScreen();
    expect(screen).toHavePathname("/login");
  });
});

describe("Verify (sign-up)", () => {
  it("shows step 3 of 4, then a correct code signs in and moves on to the address step", async () => {
    api.verifyOtp.mockResolvedValue(tokens());
    await renderRouter(appRoutes, { initialUrl: REGISTER_URL });
    expect(await screen.findByRole("header", { name: "Check your email" })).toBeOnTheScreen();
    expect(screen.getByText("Step 3 of 4")).toBeOnTheScreen();
    await fireEvent.changeText(await codeInput(), "654321");
    expect(api.verifyOtp).toHaveBeenCalledWith("ch_reg1", "654321");
    expect(await screen.findByText("Email verified")).toBeOnTheScreen();
    expect(screen).toHavePathname("/register/address");
    expect(screen.getByText("Step 4 of 4")).toBeOnTheScreen();
    await expect(tokenStore.get()).resolves.toBe("refresh-1");
  });
});
