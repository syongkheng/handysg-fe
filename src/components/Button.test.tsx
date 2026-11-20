import { fireEvent, screen } from "@testing-library/react-native";
import { renderWithTheme } from "@/test/render";
import { Button } from "./Button";

describe("Button", () => {
  it("is an accessible button named by its label and calls onPress", async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Find a plumber" onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Find a plumber" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("ignores presses while disabled", async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Pay" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole("button", { name: "Pay" }));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Pay" })).toBeDisabled();
  });

  it("ignores presses and reports busy while loading", async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Log in" onPress={onPress} loading />);
    const button = screen.getByRole("button", { name: "Log in" });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeBusy();
  });
});
