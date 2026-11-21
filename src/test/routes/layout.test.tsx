// Route tests live outside src/app/: Expo Router would treat any file there as a screen.
import { fireEvent, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { getConnectivity } from "@/api/connectivity";
import { appRoutes } from "./routes";

jest.mock("@/api/connectivity", () => ({ getConnectivity: jest.fn() }));
const getConnectivityMock = getConnectivity as jest.MockedFunction<typeof getConnectivity>;

describe("App routes", () => {
  beforeEach(() => {
    getConnectivityMock.mockReset();
    getConnectivityMock.mockResolvedValue({ status: "ok", color: "绿", timestamp: "t" });
  });

  it("has the four tabs", async () => {
    await renderRouter(appRoutes, { initialUrl: "/" });
    for (const tab of ["Home", "Jobs", "Wallet", "Profile"]) {
      expect(await screen.findByRole("button", { name: tab })).toBeOnTheScreen();
    }
  });

  it.each([
    ["/jobs", "Jobs", "Log in to see your jobs and quotes."],
    ["/wallet", "Wallet", "Log in to see your wallet and credits."],
    ["/profile", "Profile", "Log in to manage your account and addresses."],
  ])("%s shows a guest a log-in prompt instead of personal data", async (url, title, prompt) => {
    await renderRouter(appRoutes, { initialUrl: url });
    expect(await screen.findByRole("header", { name: title })).toBeOnTheScreen();
    expect(screen.getByText(prompt)).toBeOnTheScreen();
  });

  it("shows Appearance and the version on Profile, but not the API status", async () => {
    await renderRouter(appRoutes, { initialUrl: "/profile" });
    expect(await screen.findByRole("header", { name: "Appearance and language" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Privacy" })).toBeOnTheScreen();
    expect(screen.getByText("Theme")).toBeOnTheScreen();
    expect(screen.getByRole("link", { name: "Language, English" })).toBeOnTheScreen();
    // A line between the rows of each section: Theme | Language, Privacy policy | Data Usage Guide.
    expect(screen.getAllByTestId("settings-divider")).toHaveLength(2);
    expect(screen.getByText(/^Version /)).toBeOnTheScreen();
    expect(screen.queryByText("API connection")).toBeNull();
    expect(getConnectivityMock).not.toHaveBeenCalled();
  });

  it("opens the Data Usage Guide from Profile, links on to the privacy policy, and comes back", async () => {
    await renderRouter(appRoutes, { initialUrl: "/profile" });
    await fireEvent.press(await screen.findByRole("link", { name: "Data Usage Guide" }));
    expect(screen).toHavePathname("/data-usage");
    expect(await screen.findByRole("header", { name: "Who sees your address" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "Read the privacy policy" }));
    expect(screen).toHavePathname("/privacy");
    await fireEvent.press(await screen.findByRole("button", { name: "Back to Data Usage Guide" }));
    expect(screen).toHavePathname("/data-usage");
    await fireEvent.press(await screen.findByRole("button", { name: "Back to Profile" }));
    expect(screen).toHavePathname("/profile");
  });

  it("opens the Language page from Profile with English selected", async () => {
    await renderRouter(appRoutes, { initialUrl: "/profile" });
    await fireEvent.press(await screen.findByRole("link", { name: "Language, English" }));
    expect(screen).toHavePathname("/language");
    expect(await screen.findByRole("radio", { name: "English", checked: true })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Back to Profile" }));
    expect(screen).toHavePathname("/profile");
  });

  it("opens the privacy policy from Profile and comes back", async () => {
    await renderRouter(appRoutes, { initialUrl: "/profile" });
    await fireEvent.press(await screen.findByRole("link", { name: "Privacy policy" }));
    expect(screen).toHavePathname("/privacy");
    expect(await screen.findByRole("header", { name: "Privacy policy" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Back to Profile" }));
    expect(screen).toHavePathname("/profile");
  });

  it("opens the hidden Diagnostics page after 7 quick taps on the version", async () => {
    await renderRouter(appRoutes, { initialUrl: "/profile" });
    const version = await screen.findByText(/^Version /);
    for (let i = 0; i < 6; i++) await fireEvent.press(version);
    expect(screen).toHavePathname("/profile");
    await fireEvent.press(version);
    expect(screen).toHavePathname("/diagnostics");
    expect(await screen.findByText("Connected")).toBeOnTheScreen();
    expect(screen.getByText("Development")).toBeOnTheScreen();
  });

  it("draws our own app bar on Diagnostics, whose back button returns to Profile", async () => {
    await renderRouter(appRoutes, { initialUrl: "/profile" });
    const version = await screen.findByText(/^Version /);
    for (let i = 0; i < 7; i++) await fireEvent.press(version);
    expect(await screen.findByRole("header", { name: "Diagnostics" })).toBeOnTheScreen();
    expect(screen.queryByText("(tabs)")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Back to Profile" }));
    expect(screen).toHavePathname("/profile");
  });

  it("falls back to Profile when Diagnostics is opened directly with no history", async () => {
    await renderRouter(appRoutes, { initialUrl: "/diagnostics" });
    await fireEvent.press(await screen.findByRole("button", { name: "Back to Profile" }));
    expect(screen).toHavePathname("/profile");
  });

  it("switches tabs from the tab bar", async () => {
    await renderRouter(appRoutes, { initialUrl: "/" });
    await fireEvent.press(await screen.findByRole("button", { name: "Wallet" }));
    expect(await screen.findByRole("header", { name: "Wallet" })).toBeOnTheScreen();
    expect(screen).toHavePathname("/wallet");
  });

  it("shows the not-found screen with a link home for an unknown path", async () => {
    await renderRouter(appRoutes, { initialUrl: "/nope" });
    expect(await screen.findByText("This page doesn't exist.")).toBeOnTheScreen();
    expect(screen.getByText("Go to the home screen")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Back" }));
    expect(screen).toHavePathname("/");
  });
});
