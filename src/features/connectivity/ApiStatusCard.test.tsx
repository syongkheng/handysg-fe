import { fireEvent, screen } from "@testing-library/react-native";
import { ApiError, CLIENT_ERROR } from "@/api/ApiError";
import { getConnectivity } from "@/api/connectivity";
import { renderWithTheme } from "@/test/render";
import { ApiStatusCard } from "./ApiStatusCard";

jest.mock("@/api/connectivity", () => ({ getConnectivity: jest.fn() }));
const getConnectivityMock = getConnectivity as jest.MockedFunction<typeof getConnectivity>;

describe("ApiStatusCard", () => {
  beforeEach(() => getConnectivityMock.mockReset());

  it("shows Connected with the environment flag and server time", async () => {
    getConnectivityMock.mockResolvedValue({ status: "ok", color: "绿", timestamp: "2026-11-21 10:00:00" });
    await renderWithTheme(<ApiStatusCard />);
    expect(await screen.findByText("Connected")).toBeOnTheScreen();
    expect(screen.getByText("绿")).toBeOnTheScreen();
    expect(screen.getByText("2026-11-21 10:00:00")).toBeOnTheScreen();
    expect(screen.getByText("http://api.test")).toBeOnTheScreen();
  });

  it("shows Offline and the error message, then recovers on Check again", async () => {
    getConnectivityMock.mockRejectedValueOnce(new ApiError(0, CLIENT_ERROR.network, "Can't reach HandySG. Check your connection and try again."));
    await renderWithTheme(<ApiStatusCard />);
    expect(await screen.findByText("Offline")).toBeOnTheScreen();
    expect(screen.getByText(/Can't reach HandySG/)).toBeOnTheScreen();

    getConnectivityMock.mockResolvedValueOnce({ status: "ok", color: "蓝", timestamp: "t" });
    await fireEvent.press(screen.getByRole("button", { name: "Check again" }));
    expect(await screen.findByText("Connected")).toBeOnTheScreen();
    expect(screen.getByText("蓝")).toBeOnTheScreen();
  });

  it("never shows a raw non-API error", async () => {
    getConnectivityMock.mockRejectedValueOnce(new Error("internal detail"));
    await renderWithTheme(<ApiStatusCard />);
    expect(await screen.findByText("Something went wrong. Try again.")).toBeOnTheScreen();
    expect(screen.queryByText(/internal detail/)).toBeNull();
  });
});
