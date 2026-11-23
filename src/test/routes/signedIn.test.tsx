// Route tests live outside src/app/: Expo Router would treat any file there as a screen.
// The real root layout always provides a guest session (log-in isn't built yet), so this file
// swaps in a test root layout with a signed-in session to cover the signed-in branches.
import { fireEvent, screen } from "@testing-library/react-native";
import { Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { getConnectivity } from "@/api/connectivity";
import { SessionProvider, type Session } from "@/auth/SessionProvider";
import { ThemeProvider } from "@/theme";
import { appRoutes } from "./routes";

jest.mock("@/api/connectivity", () => ({ getConnectivity: jest.fn() }));
// Home and Jobs load the customer's jobs; the booking form loads options and saved addresses.
jest.mock("@/api/jobs", () => ({
  jobsApi: {
    list: jest.fn().mockResolvedValue([]),
    options: jest.fn().mockResolvedValue({
      callOutFeeCents: 100,
      currency: "SGD",
      timeSlots: [{ id: "MORNING", label: "9am – 12pm" }],
      dates: [{ date: "2026-11-24", timeSlots: ["MORNING"] }],
      descriptionMin: 10,
      descriptionMax: 1000,
    }),
    post: jest.fn(),
  },
}));
jest.mock("@/api/auth", () => {
  const actual = jest.requireActual("@/api/auth");
  return { ...actual, authApi: { ...actual.authApi, listAddresses: jest.fn().mockResolvedValue([]) } };
});
const getConnectivityMock = getConnectivity as jest.MockedFunction<typeof getConnectivity>;

const SIGNED_IN: Session = { status: "signedIn", user: { publicId: "aZ3kP9qL", username: "tan_ah_kow", type: "CUSTOMER" } };

function SignedInLayout() {
  return (
    <ThemeProvider initialPreference="light">
      <SessionProvider initialSession={SIGNED_IN}>
        <Stack screenOptions={{ headerShown: false }} />
      </SessionProvider>
    </ThemeProvider>
  );
}

const signedInRoutes = { ...appRoutes, _layout: SignedInLayout };

describe("Signed-in user", () => {
  beforeEach(() => {
    getConnectivityMock.mockReset();
    getConnectivityMock.mockResolvedValue({ status: "ok", color: "绿", timestamp: "t" });
  });

  it("greets the user by username on Home and shows their (empty) jobs instead of a log-in prompt", async () => {
    await renderRouter(signedInRoutes, { initialUrl: "/" });
    expect(await screen.findByText("Hi tan_ah_kow")).toBeOnTheScreen();
    expect(screen.queryByText("Hi there")).toBeNull();
    expect(await screen.findByText("No jobs yet. Pick a trade above to book one.")).toBeOnTheScreen();
    expect(screen.queryByText(/Log in to see your jobs/)).toBeNull();
  });

  it("opens the booking form, not the log-in screen, when they tap a trade", async () => {
    await renderRouter(signedInRoutes, { initialUrl: "/" });
    await fireEvent.press(await screen.findByRole("button", { name: /^Plumber\./ }));
    expect(screen).toHavePathname("/book/plumber");
    expect(await screen.findByRole("header", { name: "What’s wrong?" })).toBeOnTheScreen();
  });

  it("opens Your addresses, not the log-in screen, when they tap the address chip", async () => {
    await renderRouter(signedInRoutes, { initialUrl: "/" });
    await fireEvent.press(await screen.findByRole("button", { name: "Add your service address" }));
    expect(screen).toHavePathname("/addresses");
  });

  it.each([
    ["notifications", "Notifications"],
  ])("does not send them to the log-in screen when they tap %s", async (_what, name) => {
    await renderRouter(signedInRoutes, { initialUrl: "/" });
    await fireEvent.press(await screen.findByRole("button", { name }));
    expect(screen).toHavePathname("/");
    expect(screen.queryByText("Log-in and sign-up are coming in the next update.")).toBeNull();
  });

  it.each([
    ["/jobs", "Jobs", /^No jobs yet\./],
    ["/wallet", "Wallet", "Your wallet is coming soon."],
  ])("%s shows the signed-in view, not the guest prompt", async (url, title, body) => {
    await renderRouter(signedInRoutes, { initialUrl: url });
    expect(await screen.findByRole("header", { name: title })).toBeOnTheScreen();
    expect(await screen.findByText(body)).toBeOnTheScreen();
    expect(screen.queryByText("You're browsing as a guest")).toBeNull();
  });

  it("shows the username, settings and version on Profile, and the version still opens Diagnostics", async () => {
    await renderRouter(signedInRoutes, { initialUrl: "/profile" });
    expect(await screen.findByRole("header", { name: "Profile" })).toBeOnTheScreen();
    expect(screen.getByText("tan_ah_kow")).toBeOnTheScreen();
    expect(screen.queryByText("You're browsing as a guest")).toBeNull();
    expect(screen.getByRole("header", { name: "Appearance and language" })).toBeOnTheScreen();
    expect(screen.getByRole("link", { name: "Privacy policy" })).toBeOnTheScreen();
    const version = screen.getByText(/^Version /);
    for (let i = 0; i < 7; i++) await fireEvent.press(version);
    expect(screen).toHavePathname("/diagnostics");
  });
});
