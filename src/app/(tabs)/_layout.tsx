import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import { AppText } from "@/components";
import { Icon, type IconName } from "@/components/Icon";
import { useTheme } from "@/theme";

const TAB_ICON_SIZE = 22; // design-system README: 22px icons in the tab bar

function tab(title: string, icon: IconName) {
  return {
    title,
    tabBarAccessibilityLabel: title,
    tabBarIcon: ({ color }: { color: ColorValue }) => <Icon name={icon} size={TAB_ICON_SIZE} color={color} />,
    tabBarLabel: ({ focused, color }: { focused: boolean; color: ColorValue }) => (
      <AppText variant="2xs" weight={focused ? 600 : 500} style={{ color }}>
        {title}
      </AppText>
    ),
  };
}

/**
 * The four main tabs. Guests can open every tab: Jobs, Wallet and Profile show a
 * "Log in to …" prompt instead of personal data.
 */
export default function TabsLayout() {
  const { color } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.primary,
        tabBarInactiveTintColor: color.textMuted,
        tabBarStyle: { backgroundColor: color.surface, borderTopColor: color.border, borderTopWidth: 1 },
      }}
    >
      <Tabs.Screen name="index" options={tab("Home", "home")} />
      <Tabs.Screen name="jobs" options={tab("Jobs", "jobs")} />
      <Tabs.Screen name="wallet" options={tab("Wallet", "wallet")} />
      <Tabs.Screen name="profile" options={tab("Profile", "profile")} />
    </Tabs>
  );
}
