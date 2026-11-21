import { fireEvent, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { renderWithTheme } from "@/test/render";
import { color } from "@/theme/tokens.generated";
import { OptionCard } from "./OptionCard";

describe("OptionCard", () => {
  it("is a radio named by its title and hint, and calls onPress", async () => {
    const onPress = jest.fn();
    await renderWithTheme(<OptionCard title="Readable" hint="Decrypted for you." selected={false} onPress={onPress} />);
    const radio = screen.getByRole("radio", { name: "Readable. Decrypted for you." });
    expect(radio).not.toBeChecked();
    await fireEvent.press(radio);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("shows the selected state: checked, 2px primary border on primary-subtle", async () => {
    await renderWithTheme(<OptionCard title="Readable" hint="h" selected onPress={jest.fn()} />);
    const radio = screen.getByRole("radio", { name: "Readable. h" });
    expect(radio).toBeChecked();
    expect(StyleSheet.flatten(radio.props.style)).toMatchObject({
      borderWidth: 2,
      borderColor: color.light.primary,
      backgroundColor: color.light.primarySubtle,
    });
  });

  it("uses a 1px border on the surface when not selected", async () => {
    await renderWithTheme(<OptionCard title="Stored" hint="h" selected={false} onPress={jest.fn()} />);
    expect(StyleSheet.flatten(screen.getByRole("radio", { name: "Stored. h" }).props.style)).toMatchObject({
      borderWidth: 1,
      borderColor: color.light.border,
      backgroundColor: color.light.surface,
    });
  });
});
