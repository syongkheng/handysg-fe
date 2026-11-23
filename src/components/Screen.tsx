import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { space, useTheme } from "@/theme";

export interface ScreenProps {
  children: ReactNode;
  /** Wrap the content in a ScrollView (default). Turn off for screens that manage their own lists. */
  scroll?: boolean;
  /**
   * Safe-area edges to pad. With a `header`, "top" is ignored because the header clears the notch.
   */
  edges?: Edge[];
  /** A top bar (usually <AppBar />) drawn above the content. It clears the notch itself, so "top" is dropped from `edges`. */
  header?: ReactNode;
  /** Pinned below the content, outside the scroll area, so it always sits at the bottom (e.g. the app version on Profile). */
  footer?: ReactNode;
  /** Draw the footer edge to edge, without the side padding (a bottom action bar with its own background and border). */
  footerFlush?: boolean;
  /** Space between the screen's direct children. Defaults to space-4; use space-6 or more between separate sections. */
  gap?: number;
}

/** A screen's outer frame: color-bg background, safe areas, and the 20px (space-5) side padding. */
export function Screen({ children, scroll = true, edges = ["top", "bottom", "left", "right"], header, footer, footerFlush = false, gap = space[4] }: ScreenProps) {
  const { color } = useTheme();
  const content = { padding: space[5], gap } as const;

  const body = (
    <SafeAreaView edges={header ? edges.filter((e) => e !== "top") : edges} style={{ flex: 1, backgroundColor: color.bg }}>
      {scroll ? (
        <ScrollView contentContainerStyle={content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, content]}>{children}</View>
      )}
      {footer ? footerFlush ? footer : <View style={{ paddingHorizontal: space[5] }}>{footer}</View> : null}
    </SafeAreaView>
  );

  if (!header) return body;
  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      {header}
      {body}
    </View>
  );
}
