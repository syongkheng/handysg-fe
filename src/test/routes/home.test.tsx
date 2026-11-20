// Route tests live outside src/app/: Expo Router would treat any file there as a screen.
import { screen } from "@testing-library/react-native";
import { getConnectivity } from "@/api/connectivity";
import { renderWithTheme } from "@/test/render";
import HomeScreen from "@/app/index";

jest.mock("@/api/connectivity", () => ({ getConnectivity: jest.fn() }));
const getConnectivityMock = getConnectivity as jest.MockedFunction<typeof getConnectivity>;

describe("HomeScreen", () => {
  beforeEach(() => {
    getConnectivityMock.mockReset();
    getConnectivityMock.mockResolvedValue({ status: "ok", color: "绿", timestamp: "2026-11-21 10:00:00" });
  });

  it("shows the title as a header, the tagline, the API status and the appearance picker", async () => {
    await renderWithTheme(<HomeScreen />);
    expect(screen.getByRole("header", { name: "HandySG" })).toBeOnTheScreen();
    expect(screen.getByText(/Book a trusted plumber, electrician or locksmith/)).toBeOnTheScreen();
    expect(screen.getByText("Appearance")).toBeOnTheScreen();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(await screen.findByText("Connected")).toBeOnTheScreen();
    expect(getConnectivityMock).toHaveBeenCalledTimes(1);
  });
});
