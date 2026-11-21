// Route tests live outside src/app/: Expo Router would treat any file there as a screen.
import { fireEvent, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { getConnectivity } from "@/api/connectivity";
import { appRoutes } from "./routes";

jest.mock("@/api/connectivity", () => ({ getConnectivity: jest.fn() }));
const getConnectivityMock = getConnectivity as jest.MockedFunction<typeof getConnectivity>;

describe("Home (guest)", () => {
  beforeEach(() => {
    getConnectivityMock.mockReset();
    getConnectivityMock.mockResolvedValue({ status: "ok", color: "绿", timestamp: "t" });
  });

  it("shows the greeting, address chip, the promo on top, the three trades and a log-in prompt for jobs", async () => {
    await renderRouter(appRoutes, { initialUrl: "/" });
    expect(await screen.findByRole("header", { name: "What needs fixing?" })).toBeOnTheScreen();
    expect(screen.getByText("Hi there")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Add your service address" })).toBeOnTheScreen();
    for (const name of ["Plumber", "Electrician", "Locksmith"]) {
      expect(screen.getByRole("button", { name: new RegExp(`^${name}\\.`) })).toBeOnTheScreen();
    }
    expect(screen.queryByText("Coming soon")).toBeNull();
    expect(screen.queryByText("Cleaner")).toBeNull();
    expect(screen.getByText("[PROMO] off your first job")).toBeOnTheScreen();
    expect(screen.getByText(/Log in to see your jobs, quotes/)).toBeOnTheScreen();
    // The dev-only API card moved to Profile.
    expect(getConnectivityMock).not.toHaveBeenCalled();
  });

  it.each([
    ["Plumber", /^Plumber\./, "Log in to book a plumber"],
    ["Electrician", /^Electrician\./, "Log in to book an electrician"],
    ["Locksmith", /^Locksmith\./, "Log in to book a locksmith"],
    ["the address chip", "Add your service address", "Log in to save your service address"],
    ["notifications", "Notifications", "Log in to see your notifications"],
    ["Log in in Your jobs", "Log in", "Log in to see your jobs"],
  ])("sends a guest who taps %s to the log-in screen with the reason", async (_what, name, heading) => {
    await renderRouter(appRoutes, { initialUrl: "/" });
    await fireEvent.press(await screen.findByRole("button", { name }));
    expect(await screen.findByRole("header", { name: heading })).toBeOnTheScreen();
    expect(screen).toHavePathname("/login");
  });

  it("goes back to home from the log-in screen", async () => {
    await renderRouter(appRoutes, { initialUrl: "/" });
    await fireEvent.press(await screen.findByRole("button", { name: /^Plumber\./ }));
    await fireEvent.press(await screen.findByRole("button", { name: "Back to browsing" }));
    expect(await screen.findByRole("header", { name: "What needs fixing?" })).toBeOnTheScreen();
    expect(screen).toHavePathname("/");
  });

  it("closes the log-in screen with the X in its app bar", async () => {
    await renderRouter(appRoutes, { initialUrl: "/" });
    await fireEvent.press(await screen.findByRole("button", { name: "Notifications" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Close" }));
    expect(await screen.findByRole("header", { name: "What needs fixing?" })).toBeOnTheScreen();
    expect(screen).toHavePathname("/");
  });

  it("closes the promo banner with its X", async () => {
    await renderRouter(appRoutes, { initialUrl: "/" });
    expect(await screen.findByText("[PROMO] off your first job")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Close launch promo" }));
    expect(screen.queryByText("[PROMO] off your first job")).toBeNull();
    expect(screen.getByRole("header", { name: "What needs fixing?" })).toBeOnTheScreen();
  });
});
