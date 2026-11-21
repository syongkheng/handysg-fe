import { View } from "react-native";
import { AppBar, AppText, Card, Screen } from "@/components";
import { APP_VERSION } from "@/config/appInfo";
import { env } from "@/config/env";
import { ApiStatusCard } from "@/features/connectivity/ApiStatusCard";
import { space } from "@/theme";

/**
 * Hidden page: nothing links here. Opened by tapping the version on Profile 7 times.
 * For support and testing; shows nothing personal.
 */
export default function DiagnosticsScreen() {
  return (
    <Screen header={<AppBar title="Diagnostics" parent="Profile" fallbackHref="/profile" />}>
      <ApiStatusCard />
      <Card>
        <AppText variant="md">App</AppText>
        <Row label="Version" value={APP_VERSION} />
        <Row label="Build" value={env.isDev ? "Development" : "Release"} />
      </Card>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        gap: space[3],
      }}
    >
      <AppText tone="textMuted">{label}</AppText>
      <AppText weight={600}>{value}</AppText>
    </View>
  );
}
