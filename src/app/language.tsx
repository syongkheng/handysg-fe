import { Pressable, View } from "react-native";
import { AppBar, AppText, Screen } from "@/components";
import { Icon } from "@/components/Icon";
import { CURRENT_LANGUAGE, LANGUAGES } from "@/features/settings/languages";
import { SettingsGroup } from "@/features/settings/SettingsGroup";
import { size, space, useTheme } from "@/theme";

/** Language picker, opened from Profile. Lists the languages in LANGUAGES, with a tick on the current one. */
export default function LanguageScreen() {
  const { color } = useTheme();
  return (
    <Screen header={<AppBar title="Language" parent="Profile" fallbackHref="/profile" />}>
      <View accessibilityRole="radiogroup" accessibilityLabel="Language">
        <SettingsGroup title="App language">
          {LANGUAGES.map((lang) => {
            const selected = lang.code === CURRENT_LANGUAGE.code;
            return (
              <Pressable
                key={lang.code}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={lang.label}
                style={{
                  minHeight: size.tapTarget,
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: space[3],
                  paddingHorizontal: space[4],
                }}
              >
                <AppText variant="md" weight={selected ? 600 : 400} style={{ flex: 1 }}>
                  {lang.label}
                </AppText>
                {selected && <Icon name="check" size={size.iconMd} color={color.link} />}
              </Pressable>
            );
          })}
        </SettingsGroup>
      </View>
    </Screen>
  );
}
