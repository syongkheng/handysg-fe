import { View } from "react-native";
import { useRouter } from "expo-router";
import { useSession } from "@/auth/SessionProvider";
import { AppText, Button, Screen } from "@/components";
import { GuestTab } from "@/features/auth/GuestTab";
import { Notice } from "@/features/auth/Notice";
import { JobRow } from "@/features/jobs/JobRow";
import { useMyJobs } from "@/features/jobs/useMyJobs";
import { space } from "@/theme";

export default function JobsScreen() {
  const session = useSession();
  if (session.status === "guest") return <GuestTab title="Jobs" reason="see your jobs and quotes" />;
  return <MyJobs />;
}

/** The customer's jobs, newest first (reloads each time the tab is opened). */
function MyJobs() {
  const router = useRouter();
  const jobs = useMyJobs();

  return (
    <Screen edges={["top", "left", "right"]}>
      <AppText variant="2xl" accessibilityRole="header">
        Jobs
      </AppText>
      {jobs.status === "loading" ? <AppText tone="textMuted">Loading your jobs…</AppText> : null}
      {jobs.status === "error" ? (
        <>
          <Notice title="Couldn’t load your jobs">{jobs.message}</Notice>
          <Button label="Try again" variant="secondary" onPress={jobs.reload} />
        </>
      ) : null}
      {jobs.status === "done" && jobs.jobs.length === 0 ? (
        <>
          <AppText tone="textMuted">No jobs yet. Book a plumber, electrician or locksmith from Home.</AppText>
          <Button label="Book a job" onPress={() => router.navigate("/")} />
        </>
      ) : null}
      {jobs.status === "done" && jobs.jobs.length > 0 ? (
        <View style={{ gap: space[2] }}>
          {jobs.jobs.map((job) => (
            <JobRow key={job.id} job={job} onPress={() => router.push({ pathname: "/job/[id]", params: { id: job.id } })} />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
