import { useSession } from "@/auth/SessionProvider";
import { AppText, Screen } from "@/components";
import { GuestTab } from "@/features/auth/GuestTab";

export default function JobsScreen() {
  const session = useSession();
  if (session.status === "guest") return <GuestTab title="Jobs" reason="see your jobs and quotes" />;

  return (
    <Screen edges={["top", "left", "right"]}>
      <AppText variant="2xl" accessibilityRole="header">
        Jobs
      </AppText>
      <AppText tone="textMuted">No jobs yet.</AppText>
    </Screen>
  );
}
