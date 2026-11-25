import { useState } from "react";
import { Pressable, View } from "react-native";
import type { CustomerJob, JobStatus } from "@/api/jobs";
import { AppText, Icon, StatusPill, type IconName } from "@/components";
import { TRADES } from "@/features/home/trades";
import { radius, size, space, useTheme } from "@/theme";
import { JOB_STEPS, jobStageLabel, jobStatusPill, jobStatusTime, jobStepIndex, jobTitle, jobWaitingFor, tradeName, whenLabel } from "./jobFormat";

/** The icon in each status pill, so the status reads at a glance and not by colour alone. */
const STATUS_ICON: Record<JobStatus, IconName> = {
  OPEN: "activity",
  ACCEPTED: "check",
  QUOTED: "alert",
  IN_PROGRESS: "tool",
  COMPLETED: "checkCircle",
  CANCELLED: "close",
};

/**
 * Design system "Job card": the trade's icon chip, the job's title (up to two lines) over a meta
 * line ("Plumber · Tomorrow, 9am – 12pm"), then a footer with the status pill and a small progress
 * bar coloured like the job timeline (green done, amber next, grey later). A cancelled job is
 * muted: grey chip, muted title, a grey pill and a grey bar stopped where it was cancelled.
 * With `onPress` it's a button with a chevron.
 */
export function JobRow({ job, onPress }: { job: CustomerJob; onPress?: () => void }) {
  const { color } = useTheme();
  const pill = jobStatusPill(job.status, job.trade);
  const meta = `${tradeName(job.trade)} · ${whenLabel(job)}`;
  const title = jobTitle(job.description);
  const cancelled = job.status === "CANCELLED";
  const trade = TRADES.find((t) => t.id === job.trade);

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessible
      accessibilityLabel={`${title}. ${meta}. ${pill.label}. ${progressSummary(job)}`}
      accessibilityHint={onPress ? "Opens the job" : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        gap: space[3],
        padding: space[4],
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: color.border,
        backgroundColor: pressed ? color.surfaceMuted : color.surface,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space[3] }}>
        <View
          style={{
            width: space[10],
            height: space[10],
            borderRadius: radius.md,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: cancelled || !trade ? color.surfaceMuted : color[trade.chip],
          }}
        >
          <Icon name={trade?.icon ?? "tool"} size={size.iconMd} color={cancelled || !trade ? color.textMuted : color[trade.glyph]} />
        </View>
        <View style={{ flex: 1, gap: space[1] }}>
          <AppText weight={600} numberOfLines={2} tone={cancelled ? "textMuted" : "text"}>
            {title}
          </AppText>
          <AppText variant="xs" tone="textMuted" numberOfLines={1}>
            {meta}
          </AppText>
        </View>
        {onPress ? <Icon name="chevronRight" size={size.iconSm} color={color.textMuted} /> : null}
      </View>

      <View style={{ height: 1, backgroundColor: color.border }} />

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space[3] }}>
        <StatusPill label={pill.label} tone={pill.tone} icon={STATUS_ICON[job.status]} />
        <ProgressBar job={job} onPress={onPress} />
      </View>
    </Pressable>
  );
}

/**
 * Four segments coloured like the job timeline: green done/current, amber next, grey later; all grey
 * up to where a cancelled job stopped. Press and hold shows a bubble with the stage ("Step 1 of 4 ·
 * Posted", when it got there and what it's waiting for) until released. A short tap opens the job like the rest of the card.
 */
function ProgressBar({ job, onPress }: { job: CustomerJob; onPress?: () => void }) {
  const { color } = useTheme();
  const [held, setHeld] = useState(false);
  const step = jobStepIndex(job.status);
  const cancelled = job.status === "CANCELLED";
  const stage = jobStageLabel(job.status);
  const waiting = jobWaitingFor(job);
  const segment = (i: number) => {
    if (cancelled) return i <= step ? color.textMuted : color.border;
    return i <= step ? color.success : i === step + 1 ? color.warning : color.border;
  };

  return (
    <Pressable
      accessible={false}
      onPress={onPress}
      onLongPress={() => setHeld(true)}
      onPressOut={() => setHeld(false)}
      delayLongPress={300}
      hitSlop={{ top: space[5], bottom: space[5], left: space[2], right: space[2] }}
      testID="job-progress"
    >
      {held ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            right: 0,
            bottom: space[4],
            minWidth: 200, // an absolute bubble would otherwise wrap to the narrow bar
            gap: space[1],
            paddingVertical: space[2],
            paddingHorizontal: space[3],
            borderRadius: radius.sm,
            backgroundColor: color.text, // an inverted bubble: dark on light, light on dark
          }}
        >
          <AppText variant="xs" weight={600} tone="textInverse">
            {stage}
          </AppText>
          <AppText variant="xs" tone="textInverse">
            {jobStatusTime(job)}
          </AppText>
          {waiting ? (
            <AppText variant="xs" tone="textInverse">
              {waiting}
            </AppText>
          ) : null}
        </View>
      ) : null}
      <View style={{ flexDirection: "row", gap: space[1], paddingVertical: space[2] }}>
        {JOB_STEPS.map((s, i) => (
          <View key={s} style={{ width: space[5], height: space[1], borderRadius: radius.full, backgroundColor: segment(i) }} />
        ))}
      </View>
    </Pressable>
  );
}

/** What the hold bubble shows, for screen readers (which can't press and hold the bar). */
function progressSummary(job: CustomerJob): string {
  const waiting = jobWaitingFor(job);
  return [jobStageLabel(job.status), jobStatusTime(job), waiting].filter(Boolean).join(". ");
}
