// Route tests live outside src/app/: Expo Router would treat any file there as a screen.
import { screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { getConnectivity } from "@/api/connectivity";
import RootLayout from "@/app/_layout";
import HomeScreen from "@/app/index";
import NotFoundScreen from "@/app/+not-found";

jest.mock("@/api/connectivity", () => ({ getConnectivity: jest.fn() }));
const getConnectivityMock = getConnectivity as jest.MockedFunction<typeof getConnectivity>;

describe("RootLayout", () => {
  beforeEach(() => {
    getConnectivityMock.mockReset();
    getConnectivityMock.mockResolvedValue({ status: "ok", color: "绿", timestamp: "t" });
  });

  it("renders the home route inside the theme once fonts are ready", async () => {
    await renderRouter({ _layout: RootLayout, index: HomeScreen, "+not-found": NotFoundScreen }, { initialUrl: "/" });
    expect(await screen.findByRole("header", { name: "HandySG" })).toBeOnTheScreen();
    expect(await screen.findByText("Connected")).toBeOnTheScreen();
  });

  it("shows the not-found screen with a link home for an unknown path", async () => {
    await renderRouter({ _layout: RootLayout, index: HomeScreen, "+not-found": NotFoundScreen }, { initialUrl: "/nope" });
    expect(await screen.findByText("This page doesn't exist.")).toBeOnTheScreen();
    expect(screen.getByText("Go to the home screen")).toBeOnTheScreen();
  });
});
