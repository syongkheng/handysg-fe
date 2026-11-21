import { useRouter, type Href } from "expo-router";
import { Pressable, View } from "react-native";
import { AppText } from "@/components";
import { Icon } from "@/components/Icon";
import { size, space, useTheme } from "@/theme";

/**
 * A settings row that opens another page: label on the left, an optional current value
 * (e.g. "English") and a chevron on the right. Lives inside a SettingsGroup, which draws
 * the card and the lines between rows.
 */
export function LinkRow({ label, value, href }: { label: string; value?: string; href: Href }) {
  const router = useRouter();
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      onPress={() => router.push(href)}
      style={({ pressed }) => ({
        minHeight: size.tapTarget,
        flexDirection: "row",
        alignItems: "center",
        gap: space[3],
        paddingVertical: space[3],
        paddingHorizontal: space[4],
        backgroundColor: pressed ? color.surfaceMuted : color.surface,
      })}
    >
      <AppText variant="md" style={{ flex: 1 }}>
        {label}
      </AppText>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
        {value ? <AppText tone="textMuted">{value}</AppText> : null}
        <Icon name="chevronRight" size={size.iconMd} color={color.textMuted} />
      </View>
    </Pressable>
  );
}
