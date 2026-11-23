// Route tests live outside src/app/: Expo Router would treat any file there as a screen.
import RootLayout from "@/app/_layout";
import NotFoundScreen from "@/app/+not-found";
import TabsLayout from "@/app/(tabs)/_layout";
import HomeScreen from "@/app/(tabs)/index";
import JobsScreen from "@/app/(tabs)/jobs";
import ProfileScreen from "@/app/(tabs)/profile";
import WalletScreen from "@/app/(tabs)/wallet";
import DiagnosticsScreen from "@/app/diagnostics";
import AuthLayout from "@/app/(auth)/_layout";
import LoginScreen from "@/app/(auth)/login";
import RegisterPasswordStep from "@/app/(auth)/register/index";
import RegisterEmailStep from "@/app/(auth)/register/email";
import RegisterAddressStep from "@/app/(auth)/register/address";
import VerifyScreen from "@/app/(auth)/verify";
import ExportScreen from "@/app/account/export";
import DeleteAccountScreen from "@/app/account/delete";
import BookScreen from "@/app/book/[trade]";
import AddressesScreen from "@/app/addresses";
import JobDetailScreen from "@/app/job/[id]";
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
  "(auth)/_layout": AuthLayout,
  "(auth)/login": LoginScreen,
  "(auth)/register/index": RegisterPasswordStep,
  "(auth)/register/email": RegisterEmailStep,
  "(auth)/register/address": RegisterAddressStep,
  "(auth)/verify": VerifyScreen,
  "account/export": ExportScreen,
  "account/delete": DeleteAccountScreen,
  "book/[trade]": BookScreen,
  addresses: AddressesScreen,
  "job/[id]": JobDetailScreen,
  diagnostics: DiagnosticsScreen,
  privacy: PrivacyScreen,
  "data-usage": DataUsageScreen,
  language: LanguageScreen,
  "+not-found": NotFoundScreen,
};
