import { useState } from "react";
import { ActivityIndicator, Pressable, View, type PressableProps } from "react-native";
import { radius, size, space, useTheme } from "@/theme";
import { AppText } from "./AppText";

export interface ButtonProps extends Omit<PressableProps, "children" | "style"> {
  label: string;
  /**
   * One primary button per screen (design system rule). "warning" (amber) is for risky actions that
   * can be recovered from (cancelling a job); "danger" (red) only for destructive ones that can't be
   * undone (deleting an account).
   */
  variant?: "primary" | "secondary" | "warning" | "danger";
  /** Shows a spinner and blocks presses, e.g. while a request is in flight. */
  loading?: boolean;
  /** 52px by default; "compact" (48px) in 2-up rows; "tall" (56px) for a lone call to action in a card. */
  height?: "default" | "compact" | "tall";
}

export function Button({
  label,
  variant = "primary",
  loading = false,
  disabled,
  height = "default",
  onFocus,
  onBlur,
  ...rest
}: ButtonProps) {
  const { color } = useTheme();
  const [focused, setFocused] = useState(false);
  const inactive = !!disabled || loading;
  const primary = variant === "primary";
  const danger = variant === "danger";
  const warning = variant === "warning";
  // Danger and warning use text-inverse: white on light mode's dark red / amber, near-black on dark mode's
  // lighter red / amber (keeps 4.5:1 or more).
  const fg = primary ? color.onPrimary : danger || warning ? color.textInverse : color.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      {...rest}
      style={({ pressed }) => [
        {
          minHeight: size.buttonHeight + (height === "compact" ? -space[1] : height === "tall" ? space[1] : 0),
          borderRadius: radius.md,
          paddingHorizontal: space[5],
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled && !loading ? 0.5 : 1,
        },
        primary
          ? { backgroundColor: pressed ? color.primaryHover : color.primary }
          : danger || warning
            ? { backgroundColor: danger ? color.danger : color.warning, opacity: pressed ? 0.85 : disabled && !loading ? 0.5 : 1 }
            : { backgroundColor: pressed ? color.surfaceMuted : color.surface, borderWidth: 1, borderColor: color.borderStrong },
        focused && { outlineStyle: "solid", outlineWidth: 3, outlineColor: color.focusRing, outlineOffset: 0 },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
        {loading && <ActivityIndicator color={fg} accessibilityElementsHidden importantForAccessibility="no" />}
        <AppText variant="lg" style={{ color: fg }}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}
