import { Pressable } from "react-native";
import { size, space, useTheme } from "@/theme";
import { AppText, type TextVariant } from "./AppText";
import { Icon, type IconName } from "./Icon";

/**
 * An inline text action in color-link ("Change", "Resend code"), with a 44px tap target. An optional
 * `icon` sits to the right of the label, in the same colour ("Add another address +"). With
 * `spread`, the link fills the row: the label on the left, the icon at the far right.
 */
export function TextLink({
  label,
  onPress,
  variant = "base",
  disabled = false,
  accessibilityLabel,
  icon,
  spread = false,
}: {
  label: string;
  onPress: () => void;
  variant?: TextVariant;
  disabled?: boolean;
  accessibilityLabel?: string;
  icon?: IconName;
  spread?: boolean;
}) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        minHeight: size.tapTarget,
        flexDirection: "row",
        alignItems: "center",
        // Only a spread link changes its own alignment; others keep the parent's (often centred).
        ...(spread ? { justifyContent: "space-between" as const, alignSelf: "stretch" as const } : {}),
        gap: space[1],
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <AppText variant={variant} weight={600} tone={disabled ? "textMuted" : "link"}>
        {label}
      </AppText>
      {icon ? <Icon name={icon} size={size.iconMd} color={disabled ? color.textMuted : color.link} /> : null}
    </Pressable>
  );
}
