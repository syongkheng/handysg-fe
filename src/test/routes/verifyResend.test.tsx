// Route tests live outside src/app/: Expo Router would treat any file there as a screen.
// Its own file because it runs on fake timers for the whole file: switching back to real timers
// mid-file leaves React's cleanup waiting forever after renderRouter.
import { act, fireEvent, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { ApiError } from "@/api/ApiError";
import { authApi } from "@/api/auth";
import { challenge } from "@/test/authApiMock";
import { appRoutes } from "./routes";

jest.useFakeTimers();
jest.mock("@/api/connectivity", () => ({ getConnectivity: jest.fn() }));
jest.mock("@/api/auth", () => jest.requireActual("@/test/authApiMock").authApiMockFactory());
const api = authApi as jest.Mocked<typeof authApi>;

const LOGIN_URL = "/verify?challengeId=ch_login1&sentTo=t***%40gmail.com&purpose=LOGIN";
const codeInput = () => screen.findByLabelText("6-digit code");
const tick = () =>
  act(async () => {
    jest.advanceTimersByTime(1000);
  });

beforeEach(() => Object.values(api).forEach((f) => f.mockReset()));

describe("Verify: resend", () => {
  it("waits 60 s before offering a new code, then sends one to the new challenge", async () => {
    api.resendOtp.mockResolvedValue(challenge({ challengeId: "ch_login2", sentTo: "t***@gmail.com" }));
    api.verifyOtp.mockRejectedValue(new ApiError(400, "otp_invalid", "Invalid code"));
    await renderRouter(appRoutes, { initialUrl: LOGIN_URL });
    expect(await screen.findByText("Didn’t get it? Send a new code in 60s")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Send a new code" })).toBeNull();

    for (let i = 0; i < 59; i++) await tick();
    expect(screen.getByText("Didn’t get it? Send a new code in 1s")).toBeOnTheScreen();
    await tick();

    await fireEvent.press(screen.getByRole("button", { name: "Send a new code" }));
    expect(api.resendOtp).toHaveBeenCalledWith("ch_login1");
    expect(await screen.findByText("New code sent to t***@gmail.com.")).toBeOnTheScreen();
    // The cooldown starts again.
    expect(screen.getByText("Didn’t get it? Send a new code in 60s")).toBeOnTheScreen();

    // The next code is checked against the new challenge.
    await fireEvent.changeText(await codeInput(), "123456");
    expect(api.verifyOtp).toHaveBeenCalledWith("ch_login2", "123456");
  });
});
