import { fireEvent, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { size, space } from "@/theme";
import { color } from "@/theme/tokens.generated";
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

  it.each([
    ["default", undefined, size.buttonHeight],
    ["compact", "compact" as const, size.buttonHeight - space[1]],
    ["tall", "tall" as const, size.buttonHeight + space[1]],
  ])("uses the %s height", async (_name, height, expected) => {
    await renderWithTheme(<Button label="Go" height={height} onPress={jest.fn()} />);
    expect(StyleSheet.flatten(screen.getByRole("button", { name: "Go" }).props.style).minHeight).toBe(expected);
  });

  describe('variant "danger"', () => {
    const btnStyle = (name: string) => StyleSheet.flatten(screen.getByRole("button", { name }).props.style);
    const labelColor = (name: string) => StyleSheet.flatten(screen.getByText(name).props.style).color;

    it.each([
      ["light", "light" as const],
      ["dark", "dark" as const],
    ])("fills with color-danger and uses color-text-inverse for the label in %s mode", async (_n, preference) => {
      await renderWithTheme(<Button label="Delete" variant="danger" onPress={jest.fn()} />, { preference });
      expect(btnStyle("Delete")).toMatchObject({ backgroundColor: color[preference].danger, opacity: 1 });
      expect(btnStyle("Delete").borderWidth).toBeUndefined();
      expect(labelColor("Delete")).toBe(color[preference].textInverse);
    });

    it("is dimmed and ignores presses while disabled", async () => {
      const onPress = jest.fn();
      await renderWithTheme(<Button label="Delete" variant="danger" onPress={onPress} disabled />);
      expect(btnStyle("Delete").opacity).toBe(0.5);
      await fireEvent.press(screen.getByRole("button", { name: "Delete" }));
      expect(onPress).not.toHaveBeenCalled();
    });

    it("is not dimmed while loading, but reports busy", async () => {
      await renderWithTheme(<Button label="Delete" variant="danger" onPress={jest.fn()} loading />);
      expect(btnStyle("Delete").opacity).toBe(1);
      expect(screen.getByRole("button", { name: "Delete" })).toBeBusy();
    });
  });

  describe('variant "warning"', () => {
    const btnStyle = (name: string) => StyleSheet.flatten(screen.getByRole("button", { name }).props.style);
    const labelColor = (name: string) => StyleSheet.flatten(screen.getByText(name).props.style).color;

    it.each([
      ["light", "light" as const],
      ["dark", "dark" as const],
    ])("fills with color-warning (amber, not red) and uses color-text-inverse for the label in %s mode", async (_n, preference) => {
      await renderWithTheme(<Button label="Cancel job" variant="warning" onPress={jest.fn()} />, { preference });
      expect(btnStyle("Cancel job")).toMatchObject({ backgroundColor: color[preference].warning, opacity: 1 });
      expect(btnStyle("Cancel job").backgroundColor).not.toBe(color[preference].danger);
      expect(btnStyle("Cancel job").borderWidth).toBeUndefined();
      expect(labelColor("Cancel job")).toBe(color[preference].textInverse);
    });

    it("calls onPress", async () => {
      const onPress = jest.fn();
      await renderWithTheme(<Button label="Cancel job" variant="warning" onPress={onPress} />);
      await fireEvent.press(screen.getByRole("button", { name: "Cancel job" }));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it("is dimmed and ignores presses while disabled", async () => {
      const onPress = jest.fn();
      await renderWithTheme(<Button label="Cancel job" variant="warning" onPress={onPress} disabled />);
      expect(btnStyle("Cancel job").opacity).toBe(0.5);
      await fireEvent.press(screen.getByRole("button", { name: "Cancel job" }));
      expect(onPress).not.toHaveBeenCalled();
    });

    it("is not dimmed while loading, but reports busy", async () => {
      await renderWithTheme(<Button label="Cancel job" variant="warning" onPress={jest.fn()} loading />);
      expect(btnStyle("Cancel job").opacity).toBe(1);
      expect(screen.getByRole("button", { name: "Cancel job" })).toBeBusy();
    });
  });
});
