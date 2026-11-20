import { screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { renderWithTheme } from "@/test/render";
import { color, space } from "@/theme/tokens.generated";
import { AppText } from "./AppText";
import { Card } from "./Card";
import { Screen } from "./Screen";

// Swap SafeAreaView for a plain View that exposes the edges it was given.
jest.mock("react-native-safe-area-context", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    SafeAreaView: ({ edges, ...props }: { edges?: string[] } & Record<string, unknown>) => (
      <View testID="safe-area" accessibilityHint={JSON.stringify(edges)} {...props} />
    ),
  };
});

type Node = ReturnType<typeof screen.getByText>;
/** The nearest ancestor host element that is a ScrollView (it carries keyboardShouldPersistTaps). */
const scrollAncestor = (el: Node) => {
  for (let n: Node | null = el.parent; n; n = n.parent) {
    if (n.props.keyboardShouldPersistTaps !== undefined) return n;
  }
  return null;
};

describe("Screen", () => {
  it("scrolls by default, on the bg colour, padding all safe-area edges", async () => {
    await renderWithTheme(
      <Screen>
        <AppText>Inside</AppText>
      </Screen>,
    );
    expect(screen.getByText("Inside")).toBeOnTheScreen();
    const scroll = scrollAncestor(screen.getByText("Inside"));
    expect(scroll?.props.keyboardShouldPersistTaps).toBe("handled");
    expect(StyleSheet.flatten(scroll?.props.contentContainerStyle)).toMatchObject({ padding: space[5], gap: space[4] });
    const safe = screen.getByTestId("safe-area");
    expect(JSON.parse(safe.props.accessibilityHint)).toEqual(["top", "bottom", "left", "right"]);
    expect(StyleSheet.flatten(safe.props.style).backgroundColor).toBe(color.light.bg);
  });

  it("renders without a ScrollView when scroll is off, and honours custom edges", async () => {
    await renderWithTheme(
      <Screen scroll={false} edges={["bottom"]}>
        <AppText>Static</AppText>
      </Screen>,
      { preference: "dark" },
    );
    expect(screen.getByText("Static")).toBeOnTheScreen();
    expect(scrollAncestor(screen.getByText("Static"))).toBeNull();
    expect(StyleSheet.flatten(screen.getByText("Static").parent?.props.style)).toMatchObject({ flex: 1, padding: space[5], gap: space[4] });
    const safe = screen.getByTestId("safe-area");
    expect(JSON.parse(safe.props.accessibilityHint)).toEqual(["bottom"]);
    expect(StyleSheet.flatten(safe.props.style).backgroundColor).toBe(color.dark.bg);
  });
});

describe("Card", () => {
  it("draws a bordered surface from tokens and merges the caller's style", async () => {
    await renderWithTheme(
      <Card testID="card" style={{ marginTop: 7 }}>
        <AppText>Content</AppText>
      </Card>,
    );
    expect(StyleSheet.flatten(screen.getByTestId("card").props.style)).toMatchObject({
      backgroundColor: color.light.surface,
      borderColor: color.light.border,
      borderWidth: 1,
      padding: space[4],
      marginTop: 7,
    });
    expect(screen.getByText("Content")).toBeOnTheScreen();
  });
});
