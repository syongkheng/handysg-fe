import { View } from "react-native";
import { AppText, Card, Screen } from "@/components";
import { ApiStatusCard } from "@/features/connectivity/ApiStatusCard";
import { AppearancePicker } from "@/features/settings/AppearancePicker";
import { space } from "@/theme";

/** Skeleton home: proves the app can reach the API, and shows the theme in light and dark. */
export default function HomeScreen() {
  return (
    <Screen>
      <View style={{ gap: space[1], paddingTop: space[4] }}>
        <AppText variant="2xl" accessibilityRole="header">
          HandySG
        </AppText>
        <AppText tone="textMuted">Book a trusted plumber, electrician or locksmith in minutes.</AppText>
      </View>

      <ApiStatusCard />

      <Card>
        <AppText variant="md">Appearance</AppText>
        <AppearancePicker />
      </Card>
    </Screen>
  );
}
