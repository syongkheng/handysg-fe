import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { space, useTheme } from "@/theme";

export interface ScreenProps {
  children: ReactNode;
  /** Wrap the content in a ScrollView (default). Turn off for screens that manage their own lists. */
  scroll?: boolean;
  /**
   * Safe-area edges to pad. Leave out "top" on screens that show a Stack header,
   * which already clears the notch.
   */
  edges?: Edge[];
}

/** A screen's outer frame: color-bg background, safe areas, and the 20px (space-5) side padding. */
export function Screen({ children, scroll = true, edges = ["top", "bottom", "left", "right"] }: ScreenProps) {
  const { color } = useTheme();
  const content = { padding: space[5], gap: space[4] } as const;

  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: color.bg }}>
      {scroll ? (
        <ScrollView contentContainerStyle={content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, content]}>{children}</View>
      )}
    </SafeAreaView>
  );
}
