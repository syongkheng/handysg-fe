import { Link } from "expo-router";
import { AppBar, AppText, Screen } from "@/components";

export default function NotFoundScreen() {
  return (
    <Screen header={<AppBar title="Page not found" />}>
      <AppText variant="xl">This page doesn&apos;t exist.</AppText>
      <Link href="/" accessibilityRole="link">
        <AppText tone="link" weight={600}>
          Go to the home screen
        </AppText>
      </Link>
    </Screen>
  );
}
