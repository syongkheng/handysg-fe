import { View } from "react-native";
import { radius, size, space, useTheme, type ThemeColors } from "@/theme";
import { AppText } from "./AppText";
import { Icon, type IconName } from "./Icon";

export type PillTone = "success" | "warning" | "danger" | "info" | "neutral";

const toneTokens: Record<PillTone, { bg: keyof ThemeColors; fg: keyof ThemeColors }> = {
  success: { bg: "successSubtle", fg: "successText" },
  warning: { bg: "warningSubtle", fg: "warningText" },
  danger: { bg: "dangerSubtle", fg: "danger" },
  info: { bg: "primarySubtle", fg: "link" },
  neutral: { bg: "surfaceMuted", fg: "textMuted" },
};

/** Short status noun on a tinted pill. Always has words, so colour is never the only signal. */
export function StatusPill({ label, tone = "neutral", icon }: { label: string; tone?: PillTone; icon?: IconName }) {
  const { color } = useTheme();
  const t = toneTokens[tone];
  return (
    <View
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: space[1],
        backgroundColor: color[t.bg],
        borderRadius: radius.full,
        paddingVertical: space[1],
        // 4px × 10px is the pill recipe in the design-system README; 10 sits between space-2 and space-3.
        paddingHorizontal: 10,
      }}
    >
      {icon ? <Icon name={icon} size={size.iconXs} color={color[t.fg]} /> : null}
      <AppText variant="xs" weight={600} tone={t.fg}>
        {label}
      </AppText>
    </View>
  );
}
