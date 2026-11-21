import { View } from "react-native";
import { useSession, useSessionActions } from "@/auth/SessionProvider";
import { AppText, Button, Screen } from "@/components";
import { GuestTab } from "@/features/auth/GuestTab";
import { AppearancePicker } from "@/features/settings/AppearancePicker";
import { AppVersion } from "@/features/settings/AppVersion";
import { CURRENT_LANGUAGE } from "@/features/settings/languages";
import { LinkRow } from "@/features/settings/LinkRow";
import { SettingsGroup } from "@/features/settings/SettingsGroup";
import { space } from "@/theme";

/** Settings and legal pages, for guests and signed-in users alike, grouped into sections. */
function Settings() {
  return (
    <>
      <SettingsGroup title="Appearance and language">
        <View style={{ padding: space[4], gap: space[3] }}>
          <AppText variant="md">Theme</AppText>
          <AppearancePicker />
        </View>
        <LinkRow label="Language" value={CURRENT_LANGUAGE.label} href="/language" />
      </SettingsGroup>
      <SettingsGroup title="Privacy">
        <LinkRow label="Privacy policy" href="/privacy" />
        <LinkRow label="Data Usage Guide" href="/data-usage" />
      </SettingsGroup>
    </>
  );
}

export default function ProfileScreen() {
  const session = useSession();
  const { signOut } = useSessionActions();
  if (session.status === "guest") {
    // The version is pinned to the bottom of the screen (7 quick taps open the hidden Diagnostics page).
    return (
      <GuestTab title="Profile" reason="manage your account and addresses" footer={<AppVersion />}>
        <Settings />
      </GuestTab>
    );
  }

  return (
    <Screen edges={["top", "left", "right"]} footer={<AppVersion />}>
      <AppText variant="2xl" accessibilityRole="header">
        Profile
      </AppText>
      <AppText tone="textMuted">{session.user.username}</AppText>
      <Settings />
      <SettingsGroup title="Your data">
        <LinkRow label="Export my data" href="/account/export" />
        <LinkRow label="Delete account" href="/account/delete" tone="danger" />
      </SettingsGroup>
      <Button label="Log out" variant="secondary" onPress={signOut} />
    </Screen>
  );
}
