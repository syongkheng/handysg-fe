import { Pressable, View } from "react-native";
import { AppText } from "@/components";
import { radius, size, space, useTheme } from "@/theme";

/**
 * Design system "Option card": title text-base/600 over a hint text-xs muted; selected = 2px primary
 * border on primary-subtle. Used as a radio inside a radiogroup.
 */
export function OptionCard({ title, hint, selected, onPress }: { title: string; hint: string; selected: boolean; onPress: () => void }) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${hint}`}
      onPress={onPress}
      style={{
        minHeight: size.tapTarget,
        flexDirection: "row",
        gap: space[3],
        padding: space[4],
        borderRadius: radius.lg,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? color.primary : color.border,
        backgroundColor: selected ? color.primarySubtle : color.surface,
      }}
    >
      <View
        style={{
          width: size.iconMd,
          height: size.iconMd,
          marginTop: space[1] / 2,
          borderRadius: radius.full,
          borderWidth: 2,
          borderColor: selected ? color.primary : color.borderStrong,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected ? (
          <View style={{ width: space[2], height: space[2], borderRadius: radius.full, backgroundColor: color.primary }} />
        ) : null}
      </View>
      <View style={{ flex: 1, gap: space[1] }}>
        <AppText weight={600}>{title}</AppText>
        <AppText variant="xs" tone="textMuted">
          {hint}
        </AppText>
      </View>
    </Pressable>
  );
}
