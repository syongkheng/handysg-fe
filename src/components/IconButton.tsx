import { Pressable } from "react-native";
import { radius, size, useTheme } from "@/theme";
import { Icon, type IconName } from "./Icon";

/** Round 44px icon-only button. `label` is required: it is the only thing a screen reader announces. */
export function IconButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        width: size.tapTarget,
        height: size.tapTarget,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: color.border,
        backgroundColor: pressed ? color.surfaceMuted : color.surface,
        alignItems: "center",
        justifyContent: "center",
      })}
    >
      <Icon name={icon} size={size.iconMd} color={color.text} />
    </Pressable>
  );
}
