import { Pressable } from "react-native";
import { size } from "@/theme";
import { AppText, type TextVariant } from "./AppText";

/** An inline text action in color-link ("Change", "Resend code"), with a 44px tap target. */
export function TextLink({
  label,
  onPress,
  variant = "base",
  disabled = false,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: TextVariant;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({ minHeight: size.tapTarget, justifyContent: "center", opacity: pressed ? 0.6 : 1 })}
    >
      <AppText variant={variant} weight={600} tone={disabled ? "textMuted" : "link"}>
        {label}
      </AppText>
    </Pressable>
  );
}
