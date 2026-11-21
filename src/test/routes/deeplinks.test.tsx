// Route tests live outside src/app/: Expo Router would treat any file there as a screen.
import { fireEvent, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { getConnectivity } from "@/api/connectivity";
import { appRoutes } from "./routes";

jest.mock("@/api/connectivity", () => ({ getConnectivity: jest.fn() }));
const getConnectivityMock = getConnectivity as jest.MockedFunction<typeof getConnectivity>;

describe("Pages opened directly (deep links, no history)", () => {
  beforeEach(() => {
    getConnectivityMock.mockReset();
    getConnectivityMock.mockResolvedValue({ status: "ok", color: "绿", timestamp: "t" });
  });

  it("/login without a reason shows a plain 'Log in or sign up' heading", async () => {
    await renderRouter(appRoutes, { initialUrl: "/login" });
    expect(await screen.findByRole("header", { name: "Log in or sign up" })).toBeOnTheScreen();
    expect(screen.queryByText(/^Log in to /)).toBeNull();
  });

  it("/login shows a reason the app itself sends", async () => {
    await renderRouter(appRoutes, { initialUrl: "/login?reason=book%20a%20plumber" });
    expect(await screen.findByRole("header", { name: "Log in to book a plumber" })).toBeOnTheScreen();
  });

  it("/login ignores an unknown reason from a link", async () => {
    await renderRouter(appRoutes, { initialUrl: "/login?reason=claim%20your%20prize" });
    expect(await screen.findByRole("header", { name: "Log in or sign up" })).toBeOnTheScreen();
    expect(screen.queryByText(/prize/)).toBeNull();
  });

  it("/login close X goes home when there is nothing to go back to", async () => {
    await renderRouter(appRoutes, { initialUrl: "/login" });
    await fireEvent.press(await screen.findByRole("button", { name: "Close" }));
    expect(screen).toHavePathname("/");
  });

  it.each(["/privacy", "/data-usage", "/language"])("%s falls back to Profile from its back button", async (url) => {
    await renderRouter(appRoutes, { initialUrl: url });
    await fireEvent.press(await screen.findByRole("button", { name: "Back to Profile" }));
    expect(screen).toHavePathname("/profile");
  });

  it("/privacy ignores an unknown 'from' value and shows Profile as the parent", async () => {
    await renderRouter(appRoutes, { initialUrl: "/privacy?from=evil" });
    expect(await screen.findByRole("header", { name: "Privacy policy" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Back to Profile" })).toBeOnTheScreen();
    expect(screen.queryByText("evil")).toBeNull();
  });

  it("/privacy?from=data-usage shows the Data Usage Guide as the parent", async () => {
    await renderRouter(appRoutes, { initialUrl: "/privacy?from=data-usage" });
    expect(await screen.findByRole("button", { name: "Back to Data Usage Guide" })).toBeOnTheScreen();
  });
});
