import { useState } from "react";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { useSession } from "@/auth/SessionProvider";
import { useRequireAuth } from "@/auth/useRequireAuth";
import { AppText, Screen, Section } from "@/components";
import { IconButton } from "@/components/IconButton";
import { SignInPrompt } from "@/features/auth/SignInPrompt";
import { AddressChip } from "@/features/home/AddressChip";
import { LAUNCH_PROMO, PromoBanner } from "@/features/home/PromoBanner";
import { TradeTiles } from "@/features/home/TradeTiles";
import { space } from "@/theme";

/**
 * Home (wireframe A-Home). Anyone can browse it. Booking a trade, setting an address and
 * notifications need an account, so as a guest they open the log-in screen.
 */
export default function HomeScreen() {
  const session = useSession();
  const requireAuth = useRequireAuth();
  const router = useRouter();
  const signedIn = session.status === "signedIn";
  const [promoClosed, setPromoClosed] = useState(false);

  return (
    <Screen edges={["top", "left", "right"]} gap={space[6]}>
      {/* Announcements go first, above everything else. Closing one hides it until the app restarts. */}
      {LAUNCH_PROMO && !promoClosed && <PromoBanner promo={LAUNCH_PROMO} onDismiss={() => setPromoClosed(true)} />}

      {/* Booking: the question, where, then what. */}
      <View style={{ gap: space[4] }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space[3] }}>
          <View style={{ gap: space[1], flexShrink: 1 }}>
            <AppText variant="sm" tone="textMuted">
              {signedIn ? `Hi ${session.user.username}` : "Hi there"}
            </AppText>
            <AppText variant="2xl" accessibilityRole="header">
              What needs fixing?
            </AppText>
          </View>
          <IconButton icon="bell" label="Notifications" onPress={() => requireAuth("see your notifications", () => {})} />
        </View>
        <View style={{ gap: space[3] }}>
          <AddressChip onPress={() => requireAuth("save your service address", () => {})} />
          <TradeTiles onSelect={(trade) => requireAuth(`book ${trade.withArticle}`, () => {})} />
        </View>
      </View>

      <Section title="Your jobs">
        {signedIn ? (
          <AppText tone="textMuted">No jobs yet. Pick a trade above to book one.</AppText>
        ) : (
          <SignInPrompt
            title="Track your jobs"
            reason="see your jobs, quotes and technician updates"
            onLogIn={() => router.push({ pathname: "/login", params: { reason: "see your jobs" } })}
          />
        )}
      </Section>
    </Screen>
  );
}
