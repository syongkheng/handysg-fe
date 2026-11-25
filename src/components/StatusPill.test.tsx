import { screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { renderWithTheme } from "@/test/render";
import { color, size } from "@/theme/tokens.generated";
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

  describe("icon", () => {
    type Node = { type: string; props: Record<string, unknown> };
    const svgs = () => (screen.container as unknown as { queryAll: (p: (n: Node) => boolean) => Node[] }).queryAll((n) => n.type === "RNSVGSvgView");

    it("has no icon by default", async () => {
      await renderWithTheme(<StatusPill label="Draft" />);
      expect(svgs()).toHaveLength(0);
    });

    it.each<[PillTone, ColorKey, ColorKey]>([
      ["success", "successSubtle", "successText"],
      ["warning", "warningSubtle", "warningText"],
      ["info", "primarySubtle", "link"],
      ["neutral", "surfaceMuted", "textMuted"],
    ])("draws a %s pill's icon at icon-xs (12) in the label's colour, before the label", async (tone, bg, fg) => {
      await renderWithTheme(<StatusPill label="Done" tone={tone} icon="check" />);
      const [svg] = svgs();
      expect(svgs()).toHaveLength(1);
      expect(svg.props.width).toBe(size.iconXs);
      expect(svg.props.height).toBe(size.iconXs);
      expect(svg.props.stroke).toBe(color.light[fg]);
      expect(pillColours("Done")).toEqual({ fg: color.light[fg], bg: color.light[bg] });
      const pill = screen.getByText("Done").parent as unknown as { children: Node[]; props: { style: unknown } };
      expect(pill.children[0]).toBe(svg);
      expect(StyleSheet.flatten(pill.props.style as never)).toMatchObject({ flexDirection: "row", alignItems: "center" });
    });

    it("is decorative: the pill's accessible text is still just the label", async () => {
      await renderWithTheme(<StatusPill label="Cancelled" icon="close" />);
      expect(svgs()[0].props.accessibilityElementsHidden).toBe(true);
      expect(screen.getByText("Cancelled")).toBeOnTheScreen();
    });

    it("uses dark tokens for the icon in dark mode", async () => {
      await renderWithTheme(<StatusPill label="Done" tone="success" icon="checkCircle" />, { preference: "dark" });
      expect(svgs()[0].props.stroke).toBe(color.dark.successText);
    });
  });
});
