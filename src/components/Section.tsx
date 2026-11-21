import type { ReactNode } from "react";
import { View } from "react-native";
import { space } from "@/theme";
import { AppText } from "./AppText";

/** A titled group on a screen: a text-md/600 heading with its content space-3 below. Separate sections with space-6. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: space[3] }}>
      <AppText variant="md" weight={600} accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}
