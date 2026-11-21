// Route tests live outside src/app/: Expo Router would treat any file there as a screen.
import { fireEvent, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { ApiError } from "@/api/ApiError";
import { authApi } from "@/api/auth";
import { challenge } from "@/test/authApiMock";
import { appRoutes } from "./routes";

jest.mock("@/api/connectivity", () => ({ getConnectivity: jest.fn() }));
jest.mock("@/api/auth", () => jest.requireActual("@/test/authApiMock").authApiMockFactory());
const api = authApi as jest.Mocked<typeof authApi>;

const STRONG = "Abcdef1!";

/** Log-in → "No account" → Create account: the only way into sign-up with a username. */
async function startSignUp(username = "new_user") {
  api.identify.mockResolvedValue({ exists: false });
  await renderRouter(appRoutes, { initialUrl: "/login" });
  await fireEvent.changeText(await screen.findByLabelText("Username"), username);
  await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Create account" }));
  await screen.findByRole("header", { name: "Create a password" });
}

async function choosePassword(pw = STRONG, confirm = pw) {
  await fireEvent.changeText(screen.getByLabelText("Password"), pw);
  await fireEvent.changeText(screen.getByLabelText("Confirm password"), confirm);
}

async function toEmailStep(username = "new_user") {
  await startSignUp(username);
  await choosePassword();
  await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
  await screen.findByRole("header", { name: "What’s your email?" });
}

const continueButton = () => screen.getByRole("button", { name: "Continue" });

beforeEach(() => Object.values(api).forEach((f) => f.mockReset()));

describe("Sign-up step 1: password", () => {
  it("shows step 1 of 4, the chosen username and an unticked checklist", async () => {
    await startSignUp();
    expect(screen.getByText("Step 1 of 4")).toBeOnTheScreen();
    expect(screen.getByText("new_user")).toBeOnTheScreen();
    expect(screen.getByLabelText("At least 8 characters, not yet")).toBeOnTheScreen();
    expect(continueButton()).toBeDisabled();
  });

  it("ticks the checklist live as the password is typed", async () => {
    await startSignUp();
    await fireEvent.changeText(screen.getByLabelText("Password"), "abc");
    expect(screen.getByLabelText("A lowercase letter (a–z), done")).toBeOnTheScreen();
    expect(screen.getByLabelText("A number (0–9), not yet")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Password"), STRONG);
    expect(screen.getByLabelText("A special character (e.g. ! @ # ?), done")).toBeOnTheScreen();
  });

  it("keeps Continue disabled for a weak password even when confirmed", async () => {
    await startSignUp();
    await choosePassword("abcdefgh");
    expect(continueButton()).toBeDisabled();
  });

  it("doesn't flag a confirmation that is still being typed", async () => {
    await startSignUp();
    await choosePassword(STRONG, "Abc");
    expect(screen.queryByText("Passwords don't match")).toBeNull();
    expect(continueButton()).toBeDisabled();
  });

  it("flags a full-length confirmation that doesn't match", async () => {
    await startSignUp();
    await choosePassword(STRONG, "Abcdef1?");
    expect(screen.getByText("Passwords don't match")).toBeOnTheScreen();
    expect(continueButton()).toBeDisabled();
  });

  it("confirms a match and enables Continue to the email step", async () => {
    await startSignUp();
    await choosePassword();
    expect(screen.getByText("Passwords match")).toBeOnTheScreen();
    expect(continueButton()).toBeEnabled();
    await fireEvent.press(continueButton());
    expect(await screen.findByRole("header", { name: "What’s your email?" })).toBeOnTheScreen();
    expect(screen).toHavePathname("/register/email");
    expect(screen.getByText("Step 2 of 4")).toBeOnTheScreen();
  });

  it("opened directly with no username, sends the user to log in first", async () => {
    await renderRouter(appRoutes, { initialUrl: "/register" });
    expect(await screen.findByText("Start by entering a username on the log-in screen.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Go to log in" }));
    expect(await screen.findByLabelText("Username")).toBeOnTheScreen();
    expect(screen).toHavePathname("/login");
  });
});

describe("Sign-up step 2: email", () => {
  it("validates the email before calling the API", async () => {
    await toEmailStep();
    await fireEvent.changeText(screen.getByLabelText("Email"), "not-an-email");
    await fireEvent.press(screen.getByRole("button", { name: "Send code" }));
    expect(screen.getByText("Enter a valid email, like name@example.com.")).toBeOnTheScreen();
    expect(api.register).not.toHaveBeenCalled();
  });

  it("creates the account with the draft and a trimmed, lower-cased email, then goes to the code step", async () => {
    api.register.mockResolvedValue(challenge({ challengeId: "ch_reg1", purpose: "VERIFY_EMAIL", sentTo: "n***@gmail.com" }));
    await toEmailStep();
    await fireEvent.changeText(screen.getByLabelText("Email"), "  New.User@Gmail.com ");
    await fireEvent.press(screen.getByRole("button", { name: "Send code" }));
    expect(api.register).toHaveBeenCalledWith({ username: "new_user", email: "new.user@gmail.com", password: STRONG });
    expect(await screen.findByRole("header", { name: "Check your email" })).toBeOnTheScreen();
    expect(screen).toHavePathname("/verify");
    expect(screen.getByText("n***@gmail.com")).toBeOnTheScreen();
    expect(screen.getByText("Step 3 of 4")).toBeOnTheScreen();
  });

  it("explains a taken email, offers log-in, and doesn't resend the same email", async () => {
    api.register.mockRejectedValue(new ApiError(409, "email_already_registered", "Email already registered"));
    await toEmailStep();
    await fireEvent.changeText(screen.getByLabelText("Email"), "taken@example.com");
    await fireEvent.press(screen.getByRole("button", { name: "Send code" }));
    expect(await screen.findByText("This email already has an account. Use another, or log in instead.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Log in instead" })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Send code" }));
    expect(api.register).toHaveBeenCalledTimes(1);

    // A different email clears the message.
    await fireEvent.changeText(screen.getByLabelText("Email"), "other@example.com");
    expect(screen.queryByText(/already has an account/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Log in instead" })).toBeNull();
  });

  it("'Log in instead' goes back to the log-in screen", async () => {
    api.register.mockRejectedValue(new ApiError(409, "email_already_registered", "Email already registered"));
    await toEmailStep();
    await fireEvent.changeText(screen.getByLabelText("Email"), "taken@example.com");
    await fireEvent.press(screen.getByRole("button", { name: "Send code" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Log in instead" }));
    expect(screen).toHavePathname("/login");
  });

  it("explains a username taken in the meantime and offers to change it", async () => {
    api.register.mockRejectedValue(new ApiError(409, "username_taken", "Username taken"));
    await toEmailStep();
    await fireEvent.changeText(screen.getByLabelText("Email"), "me@example.com");
    await fireEvent.press(screen.getByRole("button", { name: "Send code" }));
    expect(await screen.findByText("Someone has just taken “new_user”. Pick another username.")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Send code" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Change username" }));
    expect(screen).toHavePathname("/login");
  });

  it("shows other API errors in a notice", async () => {
    api.register.mockRejectedValue(new ApiError(0, "network_error", "Can't reach HandySG. Check your connection and try again."));
    await toEmailStep();
    await fireEvent.changeText(screen.getByLabelText("Email"), "me@example.com");
    await fireEvent.press(screen.getByRole("button", { name: "Send code" }));
    expect(await screen.findByText("Couldn’t create your account")).toBeOnTheScreen();
    expect(screen.getByText("Can't reach HandySG. Check your connection and try again.")).toBeOnTheScreen();
  });
});
