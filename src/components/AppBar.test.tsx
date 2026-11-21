import { act, fireEvent, screen } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";
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

  it("calls onBack instead of navigating when given", async () => {
    const onBack = jest.fn();
    mockRouter.canGoBack.mockReturnValue(true);
    await renderWithTheme(<AppBar title="Log in" action="close" onBack={onBack} />);
    await fireEvent.press(screen.getByRole("button", { name: "Close" }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("shows 'Step 2 of 4' and a progress bar that grows from the previous step to this one", async () => {
    jest.useFakeTimers();
    try {
      await renderWithTheme(<AppBar title="Create account" step={{ current: 2, total: 4 }} />);
      expect(screen.getByText("Step 2 of 4")).toBeOnTheScreen();
      const bar = screen.getByLabelText("Step 2 of 4");
      expect(bar.props.accessibilityRole).toBe("progressbar");
      expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 4, now: 2 });
      // The coloured fill inside the bar starts at the previous step's width.
      const fillWidth = () => {
        const fill = screen.getByLabelText("Step 2 of 4").children[0] as unknown as { props: { style: ViewStyle } };
        return StyleSheet.flatten(fill.props.style)?.width;
      };
      expect(fillWidth()).toBe("25%");
      await act(async () => {
        jest.runAllTimers();
      });
      expect(fillWidth()).toBe("50%");
    } finally {
      jest.useRealTimers();
    }
  });

  it("shows no step text or progress bar without a step", async () => {
    await renderWithTheme(<AppBar title="Settings" />);
    expect(screen.queryByText(/^Step /)).toBeNull();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});

