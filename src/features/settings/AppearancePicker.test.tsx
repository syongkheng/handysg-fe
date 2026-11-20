import { fireEvent, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { AppText } from "@/components";
import { renderWithTheme } from "@/test/render";
import { useTheme } from "@/theme";
import { color } from "@/theme/tokens.generated";
import { AppearancePicker } from "./AppearancePicker";

jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({ __esModule: true, default: jest.fn(() => "dark") }));

function SchemeProbe() {
  const { scheme, color: c } = useTheme();
  return <AppText testID="probe">{`${scheme}:${c.bg}`}</AppText>;
}

const ui = (
  <>
    <AppearancePicker />
    <SchemeProbe />
  </>
);

describe("AppearancePicker", () => {
  it("is a labelled radio group with System, Light and Dark, and the current preference checked", async () => {
    await renderWithTheme(ui, { preference: "system" });
    // The group container is deliberately not `accessible` (that would hide the radios from VoiceOver),
    // so getByRole can't see it; check its label and role directly.
    expect(screen.getByLabelText("Appearance").props.accessibilityRole).toBe("radiogroup");
    expect(screen.getByRole("radio", { name: "System" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Light" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Dark" })).not.toBeChecked();
    // The system (mocked) is dark.
    expect(screen.getByTestId("probe")).toHaveTextContent(`dark:${color.dark.bg}`);
  });

  it("switches the whole theme when an option is pressed", async () => {
    await renderWithTheme(ui, { preference: "system" });

    await fireEvent.press(screen.getByRole("radio", { name: "Light" }));
    expect(screen.getByRole("radio", { name: "Light" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "System" })).not.toBeChecked();
    expect(screen.getByTestId("probe")).toHaveTextContent(`light:${color.light.bg}`);

    await fireEvent.press(screen.getByRole("radio", { name: "Dark" }));
    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
    expect(screen.getByTestId("probe")).toHaveTextContent(`dark:${color.dark.bg}`);

    await fireEvent.press(screen.getByRole("radio", { name: "System" }));
    expect(screen.getByRole("radio", { name: "System" })).toBeChecked();
    expect(screen.getByTestId("probe")).toHaveTextContent(`dark:${color.dark.bg}`);
  });

  it("marks the selected option with a 2px primary border and meets the tap-target size", async () => {
    await renderWithTheme(ui, { preference: "light" });
    const selected = StyleSheet.flatten(screen.getByRole("radio", { name: "Light" }).props.style);
    const other = StyleSheet.flatten(screen.getByRole("radio", { name: "Dark" }).props.style);
    expect(selected).toMatchObject({ borderWidth: 2, borderColor: color.light.primary, backgroundColor: color.light.primarySubtle });
    expect(other).toMatchObject({ borderWidth: 1, borderColor: color.light.borderStrong, backgroundColor: color.light.surface });
    expect(selected.minHeight).toBeGreaterThanOrEqual(44);
  });
});
