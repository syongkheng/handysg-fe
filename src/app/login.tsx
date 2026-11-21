import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import { AppBar, AppText, Button, Card, Screen } from "@/components";
import { space } from "@/theme";

/**
 * Where guests land when they try something that needs an account. `reason` completes
 * "Log in to …" (e.g. "book a plumber").
 *
 * Placeholder: the log-in, sign-up and email-code forms arrive in the auth branch and replace this body.
 */
export default function LoginScreen() {
  const router = useRouter();
  const { reason } = useLocalSearchParams<{ reason?: string }>();

  return (
    <Screen header={<AppBar title="Log in" action="close" />}>
      <View style={{ gap: space[2] }}>
        <AppText variant="2xl" accessibilityRole="header">
          {reason ? `Log in to ${reason}` : "Log in"}
        </AppText>
        <AppText tone="textMuted">You need a HandySG account for this. It only takes a minute to sign up.</AppText>
      </View>
      <Card>
        <AppText tone="textMuted">Log-in and sign-up are coming in the next update.</AppText>
      </Card>
      <Button label="Back to browsing" variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
    </Screen>
  );
}
