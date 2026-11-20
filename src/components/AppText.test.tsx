import { screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { renderWithTheme } from "@/test/render";
import { color, text } from "@/theme/tokens.generated";
import { AppText } from "./AppText";

const styleOf = (label: string) => StyleSheet.flatten(screen.getByText(label).props.style);

describe("AppText", () => {
  it("defaults to the base step, its weight and the text colour", async () => {
    await renderWithTheme(<AppText>Body</AppText>);
    expect(styleOf("Body")).toMatchObject({
      fontSize: text.base.fontSize,
      lineHeight: text.base.lineHeight,
      fontFamily: "Inter_400Regular",
      color: color.light.text,
    });
  });

  it("uses the variant's size and default weight", async () => {
    await renderWithTheme(<AppText variant="2xl">Title</AppText>);
    const s = styleOf("Title");
    expect(s.fontSize).toBe(text["2xl"].fontSize);
    expect(s.lineHeight).toBe(text["2xl"].lineHeight);
    const familyByWeight: Record<number, string> = { 400: "Inter_400Regular", 500: "Inter_500Medium", 600: "Inter_600SemiBold", 700: "Inter_700Bold" };
    expect(s.fontFamily).toBe(familyByWeight[Number(text["2xl"].fontWeight)]);
  });

  it("lets weight override the variant's weight and tone pick a colour token", async () => {
    await renderWithTheme(
      <AppText weight={700} tone="danger">
        Error
      </AppText>,
    );
    expect(styleOf("Error")).toMatchObject({ fontFamily: "Inter_700Bold", color: color.light.danger });
  });

  it("renders an overline as uppercase xs 600 with 0.06em tracking, whatever the variant", async () => {
    await renderWithTheme(
      <AppText overline variant="2xl">
        Section
      </AppText>,
    );
    expect(styleOf("Section")).toMatchObject({
      fontSize: text.xs.fontSize,
      lineHeight: text.xs.lineHeight,
      fontFamily: "Inter_600SemiBold",
      textTransform: "uppercase",
      letterSpacing: text.xs.fontSize * 0.06,
    });
  });

  it("uses the dark token set in dark mode", async () => {
    await renderWithTheme(<AppText tone="link">Link</AppText>, { preference: "dark" });
    expect(styleOf("Link").color).toBe(color.dark.link);
  });

  it("lets a caller style win and passes other Text props through", async () => {
    await renderWithTheme(
      <AppText style={{ color: "red" }} accessibilityRole="header" numberOfLines={1}>
        Custom
      </AppText>,
    );
    expect(styleOf("Custom").color).toBe("red");
    expect(screen.getByRole("header", { name: "Custom" })).toBeOnTheScreen();
    expect(screen.getByText("Custom").props.numberOfLines).toBe(1);
  });
});
