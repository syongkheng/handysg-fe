import type { ReactNode } from "react";
import { View } from "react-native";
import { AppText, Icon } from "@/components";
import { radius, size, space, useTheme } from "@/theme";

const TONES = {
  danger: { bg: "dangerSubtle", icon: "danger", glyph: "alert" },
  info: { bg: "primarySubtle", icon: "link", glyph: "alert" },
  success: { bg: "successSubtle", icon: "success", glyph: "checkCircle" },
} as const;

/** A small inline notice (radius-sm): "danger" for errors from the server, "info" for neutral hints, "success" to confirm a step. */
export function Notice({ tone = "danger", title, children }: { tone?: keyof typeof TONES; title?: string; children?: ReactNode }) {
  const { color } = useTheme();
  const danger = tone === "danger";
  const t = TONES[tone];
  return (
    <View
      accessibilityRole={danger ? "alert" : undefined}
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: "row",
        gap: space[2],
        padding: space[3],
        borderRadius: radius.sm,
        backgroundColor: color[t.bg],
      }}
    >
      <Icon name={t.glyph} size={size.iconMd} color={color[t.icon]} />
      <View style={{ flex: 1, gap: space[1] }}>
        {title ? (
          <AppText variant="sm" weight={600}>
            {title}
          </AppText>
        ) : null}
        {typeof children === "string" ? <AppText variant="sm">{children}</AppText> : children}
      </View>
    </View>
  );
}
