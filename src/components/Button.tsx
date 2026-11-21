import { useState } from "react";
import { ActivityIndicator, Pressable, View, type PressableProps } from "react-native";
import { radius, size, space, useTheme } from "@/theme";
import { AppText } from "./AppText";

export interface ButtonProps extends Omit<PressableProps, "children" | "style"> {
  label: string;
  /** One primary button per screen (design system rule). */
  variant?: "primary" | "secondary";
  /** Shows a spinner and blocks presses, e.g. while a request is in flight. */
  loading?: boolean;
  /** 52px by default; "compact" (48px) in 2-up rows; "tall" (56px) for a lone call to action in a card. */
  height?: "default" | "compact" | "tall";
}

export function Button({ label, variant = "primary", loading = false, disabled, height = "default", onFocus, onBlur, ...rest }: ButtonProps) {
  const { color } = useTheme();
  const [focused, setFocused] = useState(false);
  const inactive = !!disabled || loading;
  const primary = variant === "primary";
  const fg = primary ? color.onPrimary : color.text;

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
