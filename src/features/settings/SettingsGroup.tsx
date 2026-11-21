import { Children, Fragment, type ReactNode } from "react";
import { View } from "react-native";
import { AppText } from "@/components";
import { radius, space, useTheme } from "@/theme";

/**
 * A titled group of settings rows: an overline heading, then one card whose rows are
 * separated by 1px color-border lines (iOS/Android grouped-list style).
 */
export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  const { color } = useTheme();
  const rows = Children.toArray(children);
  return (
    <View style={{ gap: space[2] }}>
      <AppText overline tone="textMuted" accessibilityRole="header" style={{ paddingHorizontal: space[1] }}>
        {title}
      </AppText>
      <View style={{ backgroundColor: color.surface, borderColor: color.border, borderWidth: 1, borderRadius: radius.lg, overflow: "hidden" }}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 && <View testID="settings-divider" style={{ height: 1, backgroundColor: color.border, marginLeft: space[4] }} />}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}
