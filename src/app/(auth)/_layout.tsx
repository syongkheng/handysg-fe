import { Stack } from "expo-router";
import type { ReactNode } from "react";
import { Platform } from "react-native";
import { SafeAreaInsetsContext, useSafeAreaInsets } from "react-native-safe-area-context";
import { RegisterDraftProvider } from "@/features/auth/RegisterDraft";
import { useTheme } from "@/theme";

// Opened from a deep link straight to /register or /verify, the stack still starts at log-in.
export const unstable_settings = { anchor: "login" };

/**
 * The log-in and sign-up flow, presented as one modal over the app (see src/app/_layout.tsx).
 * Steps push inside this stack; useCloseAuthFlow() closes the whole modal. The sign-up draft
 * lives here, so moving between steps keeps what was typed.
 */
export default function AuthLayout() {
  const { color } = useTheme();
  return (
    <SheetInsets>
      <RegisterDraftProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }} />
      </RegisterDraftProvider>
    </SheetInsets>
  );
}

/**
 * On iOS the modal is a sheet that already starts below the status bar, so the App bar must not
 * add the notch inset on top (it would leave an empty band above the title). Android shows the
 * modal full screen, so it keeps the inset.
 */
function SheetInsets({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  if (Platform.OS !== "ios") return <>{children}</>;
  return <SafeAreaInsetsContext.Provider value={{ ...insets, top: 0 }}>{children}</SafeAreaInsetsContext.Provider>;
}
