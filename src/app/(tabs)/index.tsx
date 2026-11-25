import { useState } from "react";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { useSession } from "@/auth/SessionProvider";
import { useRequireAuth } from "@/auth/useRequireAuth";
import { AppText, Screen, Section, TextLink } from "@/components";
import { IconButton } from "@/components/IconButton";
import { SignInPrompt } from "@/features/auth/SignInPrompt";
import { AddressChip } from "@/features/home/AddressChip";
import { LAUNCH_PROMO, PromoBanner } from "@/features/home/PromoBanner";
import { TradeTiles } from "@/features/home/TradeTiles";
import { useAddresses } from "@/features/address/useAddresses";
import { formatAddress } from "@/features/jobs/jobFormat";
import { JobRow } from "@/features/jobs/JobRow";
import { useMyJobs } from "@/features/jobs/useMyJobs";
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
  const addresses = useAddresses();
  const defaultAddress = addresses.status === "done" ? (addresses.addresses.find((a) => a.isDefault) ?? addresses.addresses[0]) : undefined;

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
          <AddressChip address={defaultAddress ? formatAddress(defaultAddress) : undefined} onPress={() => requireAuth("save your service address", () => router.push("/addresses"))} />
          <TradeTiles
            onSelect={(trade) =>
              requireAuth(`book ${trade.withArticle}`, () => router.push({ pathname: "/book/[trade]", params: { trade: trade.id.toLowerCase() } }))
            }
          />
        </View>
      </View>

      <Section title="Your jobs">
        {signedIn ? (
          <RecentJobs />
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

/** Home shows the latest few jobs; the Jobs tab has them all. */
const RECENT_JOBS = 3;

function RecentJobs() {
  const router = useRouter();
  const jobs = useMyJobs();
  if (jobs.status === "loading") return <AppText tone="textMuted">Loading your jobs…</AppText>;
  if (jobs.status === "error") return <AppText tone="textMuted">{jobs.message}</AppText>;
  if (jobs.jobs.length === 0) return <AppText tone="textMuted">No jobs yet. Pick a trade above to book one.</AppText>;
  return (
    <View style={{ gap: space[3] }}>
      {jobs.jobs.slice(0, RECENT_JOBS).map((job) => (
        <JobRow key={job.id} job={job} onPress={() => router.push({ pathname: "/job/[id]", params: { id: job.id } })} />
      ))}
      {jobs.jobs.length > RECENT_JOBS ? (
        <View style={{ alignItems: "flex-start" }}>
          <TextLink label="See all jobs" onPress={() => router.push("/jobs")} />
        </View>
      ) : null}
    </View>
  );
}
