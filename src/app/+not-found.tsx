import { Link, Stack } from "expo-router";
import { AppText, Screen } from "@/components";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Page not found" }} />
      <Screen edges={["bottom", "left", "right"]}>
        <AppText variant="xl">This page doesn&apos;t exist.</AppText>
        <Link href="/" accessibilityRole="link">
          <AppText tone="link" weight={600}>
            Go to the home screen
          </AppText>
        </Link>
      </Screen>
    </>
  );
}
