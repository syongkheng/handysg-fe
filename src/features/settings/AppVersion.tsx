import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Pressable } from "react-native";
import { AppText } from "@/components";
import { APP_VERSION } from "@/config/appInfo";
import { useTapSequence } from "@/hooks/useTapSequence";
import { size } from "@/theme";

/**
 * "Version 1.0.0" at the bottom of Profile. Tapping it 7 times quickly opens the hidden
 * Diagnostics page (API connection). Deliberately not announced as a button.
 */
export function AppVersion() {
  const router = useRouter();
  const openDiagnostics = useCallback(() => router.push("/diagnostics"), [router]);
  const onPress = useTapSequence(openDiagnostics);

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`Version ${APP_VERSION}`}
      style={{ minHeight: size.tapTarget, alignItems: "center", justifyContent: "center" }}
    >
      <AppText variant="xs" tone="textMuted">
        Version {APP_VERSION}
      </AppText>
    </Pressable>
  );
}
