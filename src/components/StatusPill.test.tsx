import { screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { renderWithTheme } from "@/test/render";
import { color } from "@/theme/tokens.generated";
import { StatusPill, type PillTone } from "./StatusPill";

type ColorKey = keyof typeof color.light;

/** The label's text colour, and the background of the nearest ancestor that has one (the pill). */
const pillColours = (label: string) => {
  const el = screen.getByText(label);
  let node = el.parent;
  let bg: unknown;
  while (node && bg === undefined) {
    bg = StyleSheet.flatten(node.props.style)?.backgroundColor;
    node = node.parent;
  }
  return { fg: StyleSheet.flatten(el.props.style).color, bg };
};

describe("StatusPill", () => {
  it.each<[PillTone, ColorKey, ColorKey]>([
    ["success", "successSubtle", "successText"],
    ["warning", "warningSubtle", "warningText"],
    ["danger", "dangerSubtle", "danger"],
    ["info", "primarySubtle", "link"],
    ["neutral", "surfaceMuted", "textMuted"],
  ])("renders the %s tone with its background and text tokens", async (tone, bg, fg) => {
    await renderWithTheme(<StatusPill label="Status" tone={tone} />);
    expect(pillColours("Status")).toEqual({ fg: color.light[fg], bg: color.light[bg] });
  });

  it("defaults to the neutral tone and always shows its words", async () => {
    await renderWithTheme(<StatusPill label="Draft" />);
    expect(screen.getByText("Draft")).toBeOnTheScreen();
    expect(pillColours("Draft")).toEqual({ fg: color.light.textMuted, bg: color.light.surfaceMuted });
  });

  it("uses dark tokens in dark mode", async () => {
    await renderWithTheme(<StatusPill label="Done" tone="success" />, { preference: "dark" });
    expect(pillColours("Done")).toEqual({ fg: color.dark.successText, bg: color.dark.successSubtle });
  });
});
