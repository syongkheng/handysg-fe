import { Stack } from "expo-router";
import { SheetInsets } from "@/components/SheetInsets";
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
