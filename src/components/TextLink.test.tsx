import { fireEvent, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { renderWithTheme } from "@/test/render";
import { size } from "@/theme";
import { color } from "@/theme/tokens.generated";
import { TextLink } from "./TextLink";

type Node = { type: string; props: Record<string, unknown>; children?: (Node | string)[] | null };
const link = (name: string) => screen.getByRole("button", { name });
const style = (name: string) => StyleSheet.flatten(link(name).props.style);
/** The rendered children of the link: the label's Text, then the icon's Svg (if any). */
const parts = () => ((screen.toJSON() as Node).children ?? []) as Node[];
const svg = () => parts().find((n) => n.type === "RNSVGSvgView");

describe("TextLink", () => {
  it("is a button named by its label, with a 44px tap target, and calls onPress", async () => {
    const onPress = jest.fn();
    await renderWithTheme(<TextLink label="Resend code" onPress={onPress} />);
    expect(style("Resend code").minHeight).toBe(size.tapTarget);
    await fireEvent.press(link("Resend code"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("has no icon unless asked", async () => {
    await renderWithTheme(<TextLink label="Change" onPress={jest.fn()} />);
    expect(svg()).toBeUndefined();
  });

  it("puts the icon after the label, in color-link at the medium icon size", async () => {
    await renderWithTheme(<TextLink label="Add another address" icon="plus" onPress={jest.fn()} />);
    const [label, icon] = parts();
    expect(label.type).toBe("Text");
    expect(label.children).toEqual(["Add another address"]);
    expect(icon.type).toBe("RNSVGSvgView");
    expect(icon.props).toMatchObject({ stroke: color.light.link, width: size.iconMd, height: size.iconMd });
    // The icon is decorative; the link's label names it.
    expect(link("Add another address")).toBeOnTheScreen();
  });

  it("mutes the icon and ignores presses when disabled", async () => {
    const onPress = jest.fn();
    await renderWithTheme(<TextLink label="Add another address" icon="plus" disabled onPress={onPress} />);
    expect(svg()?.props.stroke).toBe(color.light.textMuted);
    await fireEvent.press(link("Add another address"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("spread: fills the row with the label left and the icon right", async () => {
    await renderWithTheme(<TextLink label="Add another address" icon="plus" spread onPress={jest.fn()} />);
    expect(style("Add another address")).toMatchObject({ flexDirection: "row", justifyContent: "space-between", alignSelf: "stretch" });
  });

  it("without spread, keeps the parent's alignment (no justifyContent or alignSelf of its own)", async () => {
    await renderWithTheme(<TextLink label="I’ll add my address later" icon="plus" onPress={jest.fn()} />);
    const s = style("I’ll add my address later");
    expect(s.justifyContent).toBeUndefined();
    expect(s.alignSelf).toBeUndefined();
  });
});
