import type { ReactNode } from "react";
import { Platform } from "react-native";
import { SafeAreaInsetsContext, useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Wrap a modal's content in this. On iOS the modal is a sheet that already starts below the status
 * bar, so the App bar must not add the notch inset on top (it would leave an empty band above the
 * title). Android shows the modal full screen, so it keeps the inset.
 */
export function SheetInsets({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  if (Platform.OS !== "ios") return <>{children}</>;
  return <SafeAreaInsetsContext.Provider value={{ ...insets, top: 0 }}>{children}</SafeAreaInsetsContext.Provider>;
}
