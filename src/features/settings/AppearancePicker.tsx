import { Pressable, View } from "react-native";
import { AppText } from "@/components";
import { radius, size, space, useTheme, type ThemePreference } from "@/theme";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/** Follow the phone's setting, or force light/dark. Uses the option-card pattern (selected = 2px primary border). */
export function AppearancePicker() {
  const { color, preference, setPreference } = useTheme();

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Appearance" style={{ flexDirection: "row", gap: space[2] }}>
      {OPTIONS.map((o) => {
        const selected = o.value === preference;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={o.label}
            onPress={() => setPreference(o.value)}
            style={{
              flex: 1,
              minHeight: size.tapTarget,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radius.md,
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? color.primary : color.borderStrong,
              backgroundColor: selected ? color.primarySubtle : color.surface,
            }}
          >
            <AppText weight={selected ? 600 : 400}>{o.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
