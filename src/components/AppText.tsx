import { Text, type TextProps } from "react-native";
import { fontFamily, text, useTheme, type FontWeight, type ThemeColors } from "@/theme";

export type TextVariant = keyof typeof text;

export interface AppTextProps extends TextProps {
  /** Type scale step; "base" (14/20) is the body default. */
  variant?: TextVariant;
  /** Overrides the variant's default weight. */
  weight?: FontWeight;
  /** A colour token, e.g. "textMuted", "link", "danger". Defaults to "text". */
  tone?: keyof ThemeColors;
  /** UPPERCASE overline label: text-xs, 600, 0.06em tracking. */
  overline?: boolean;
}

/** All text in the app goes through this, so size, line height, weight and colour come from tokens. */
export function AppText({ variant = "base", weight, tone = "text", overline = false, style, ...rest }: AppTextProps) {
  const { color } = useTheme();
  const step = text[overline ? "xs" : variant];
  const w = weight ?? (overline ? 600 : (step.fontWeight as FontWeight));

  return (
    <Text
      {...rest}
      style={[
        { fontFamily: fontFamily(w), fontSize: step.fontSize, lineHeight: step.lineHeight, color: color[tone] },
        overline && { textTransform: "uppercase", letterSpacing: step.fontSize * 0.06 },
        style,
      ]}
    />
  );
}
