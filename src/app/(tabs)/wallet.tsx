import { useSession } from "@/auth/SessionProvider";
import { AppText, Screen } from "@/components";
import { GuestTab } from "@/features/auth/GuestTab";

export default function WalletScreen() {
  const session = useSession();
  if (session.status === "guest") return <GuestTab title="Wallet" reason="see your wallet and credits" />;

  return (
    <Screen edges={["top", "left", "right"]}>
      <AppText variant="2xl" accessibilityRole="header">
        Wallet
      </AppText>
      <AppText tone="textMuted">Your wallet is coming soon.</AppText>
    </Screen>
  );
}
