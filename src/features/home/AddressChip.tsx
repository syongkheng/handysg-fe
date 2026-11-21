import { Pressable, View } from "react-native";
import { AppText } from "@/components";
import { Icon } from "@/components/Icon";
import { radius, size, space, useTheme } from "@/theme";

/**
 * "Service address" row. Guests (and users with no saved address) see "Add your address".
 * The address itself is personal data (PDPA), so it is only ever shown to its signed-in owner.
 */
export function AddressChip({ address, onPress }: { address?: string; onPress: () => void }) {
  const { color } = useTheme();
  const action = address ? "Change" : "Add";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={address ? `Service address, ${address}` : "Add your service address"}
      accessibilityHint={address ? "Change your service address" : undefined}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: space[3],
        minHeight: size.tapTarget,
        paddingVertical: space[3],
        paddingHorizontal: space[4],
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: color.border,
        backgroundColor: pressed ? color.surfaceMuted : color.surface,
      })}
    >
      <Icon name="pin" size={size.iconMd} color={color.primary} />
      <View style={{ flex: 1 }}>
        <AppText variant="xs" tone="textMuted">
          Service address
        </AppText>
        <AppText weight={600} numberOfLines={1}>
          {address ?? "Add your address"}
        </AppText>
      </View>
      <AppText variant="sm" weight={600} tone="link">
        {action}
      </AppText>
    </Pressable>
  );
}
