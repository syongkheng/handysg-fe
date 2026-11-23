import { Pressable, View } from "react-native";
import type { CustomerJob } from "@/api/jobs";
import { AppText, Icon, StatusPill } from "@/components";
import { radius, size, space, useTheme } from "@/theme";
import { jobStatusPill, jobTitle, tradeName, whenLabel } from "./jobFormat";

/**
 * Design system "Job row": title over a meta line ("Plumber · Tomorrow, 9am – 12pm"), status pill
 * on the right. With `onPress` it's a button with a chevron that opens the job.
 */
export function JobRow({ job, onPress }: { job: CustomerJob; onPress?: () => void }) {
  const { color } = useTheme();
  const pill = jobStatusPill(job.status, job.trade);
  const meta = `${tradeName(job.trade)} · ${whenLabel(job)}`;
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessible
      accessibilityLabel={`${jobTitle(job.description)}. ${meta}. ${pill.label}`}
      accessibilityHint={onPress ? "Opens the job" : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: space[3],
        padding: space[4],
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: color.border,
        backgroundColor: pressed ? color.surfaceMuted : color.surface,
      })}
    >
      <View style={{ flex: 1, gap: space[1] }}>
        <AppText weight={600} numberOfLines={1}>
          {jobTitle(job.description)}
        </AppText>
        <AppText variant="xs" tone="textMuted" numberOfLines={1}>
          {meta}
        </AppText>
      </View>
      <StatusPill label={pill.label} tone={pill.tone} />
      {onPress ? <Icon name="chevronRight" size={size.iconSm} color={color.textMuted} /> : null}
    </Pressable>
  );
}
