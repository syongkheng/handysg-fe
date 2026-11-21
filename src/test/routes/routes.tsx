// Route tests live outside src/app/: Expo Router would treat any file there as a screen.
import RootLayout from "@/app/_layout";
import NotFoundScreen from "@/app/+not-found";
import TabsLayout from "@/app/(tabs)/_layout";
import HomeScreen from "@/app/(tabs)/index";
import JobsScreen from "@/app/(tabs)/jobs";
import ProfileScreen from "@/app/(tabs)/profile";
import WalletScreen from "@/app/(tabs)/wallet";
import DiagnosticsScreen from "@/app/diagnostics";
import LoginScreen from "@/app/login";
import PrivacyScreen from "@/app/privacy";
import DataUsageScreen from "@/app/data-usage";
import LanguageScreen from "@/app/language";

/** The app's real route tree, for expo-router's renderRouter. */
export const appRoutes = {
  _layout: RootLayout,
  "(tabs)/_layout": TabsLayout,
  "(tabs)/index": HomeScreen,
  "(tabs)/jobs": JobsScreen,
  "(tabs)/wallet": WalletScreen,
  "(tabs)/profile": ProfileScreen,
  login: LoginScreen,
  diagnostics: DiagnosticsScreen,
  privacy: PrivacyScreen,
  "data-usage": DataUsageScreen,
  language: LanguageScreen,
  "+not-found": NotFoundScreen,
};
