import { useLocalSearchParams } from "expo-router";
import { AppBar, AppText, Card, Screen } from "@/components";

/**
 * Privacy policy, opened from Profile.
 *
 * Placeholder: the policy text is still being written (legal is an open item in the project
 * brief). Replace this body with the final text, or link out to the published policy.
 */
export default function PrivacyScreen() {
  // Breadcrumb: opened from Profile, or from the Data Usage Guide's link. Only known values are shown.
  const { from } = useLocalSearchParams<{ from?: string }>();
  const parent = from === "data-usage" ? "Data Usage Guide" : "Profile";
  return (
    <Screen header={<AppBar title="Privacy policy" parent={parent} fallbackHref="/profile" />}>
      <Card>
        <AppText tone="textMuted">Our privacy policy is being finalised and will be published here before launch.</AppText>
      </Card>
    </Screen>
  );
}
