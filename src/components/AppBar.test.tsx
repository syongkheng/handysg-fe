import { fireEvent, screen } from "@testing-library/react-native";
import { renderWithTheme } from "@/test/render";
import { AppBar } from "./AppBar";

const mockRouter = { canGoBack: jest.fn(), back: jest.fn(), replace: jest.fn() };
jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

describe("AppBar", () => {
  beforeEach(() => Object.values(mockRouter).forEach((f) => f.mockReset()));

  it("shows the title as a header and a plain 'Back' button with no parent", async () => {
    await renderWithTheme(<AppBar title="Settings" />);
    expect(screen.getByRole("header", { name: "Settings" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Back" })).toBeOnTheScreen();
  });

  it("shows the parent as a breadcrumb and names the back button after it", async () => {
    await renderWithTheme(<AppBar title="Language" parent="Profile" />);
    expect(screen.getByText("Profile")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Back to Profile" })).toBeOnTheScreen();
  });

  it("labels the button 'Close' for modals, even with a parent", async () => {
    await renderWithTheme(<AppBar title="Log in" parent="Home" action="close" />);
    expect(screen.getByRole("button", { name: "Close" })).toBeOnTheScreen();
  });

  it("goes back when there is history", async () => {
    mockRouter.canGoBack.mockReturnValue(true);
    await renderWithTheme(<AppBar title="X" fallbackHref="/profile" />);
    await fireEvent.press(screen.getByRole("button", { name: "Back" }));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("replaces to the fallback (default '/') when there is no history", async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    await renderWithTheme(<AppBar title="X" />);
    await fireEvent.press(screen.getByRole("button", { name: "Back" }));
    expect(mockRouter.replace).toHaveBeenCalledWith("/");
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});
