import { Pressable, ScrollView, View } from "react-native";
import type { JobOptions, JobUrgency, TimeSlot } from "@/api/jobs";
import { AppText, Card } from "@/components";
import { OptionCard } from "@/features/account/OptionCard";
import { radius, size, space, useTheme } from "@/theme";
import { dayChip, dayLabel } from "./jobFormat";

export interface WhenValue {
  urgency: JobUrgency;
  /** SCHEDULED: "YYYY-MM-DD", one of options.dates. */
  date?: string;
  timeSlot?: TimeSlot;
}

/**
 * "When?": Urgent now, or Schedule for a day (from today up to the bookable limit, as a row of day
 * chips you can swipe) and a time window, each row under a small overline label. Time chips are
 * always one line, so they're all the same height; a window that's too soon today is disabled
 * (muted, dashed) and one line under the row explains why. Used when posting a job and when editing one.
 */
export function WhenPicker({
  options,
  value,
  onChange,
  tradeName,
  error,
  framed = true,
}: {
  options: Pick<JobOptions, "dates" | "timeSlots">;
  value: WhenValue;
  onChange: (value: WhenValue) => void;
  /** "plumber", for the urgent note. */
  tradeName: string;
  error?: string;
  /**
   * Put the day and time rows on their own card, so they read as part of "Schedule" and apart from
   * what follows. Off when the picker already sits inside a card (editing a job).
   */
  framed?: boolean;
}) {
  const day = options.dates.find((d) => d.date === value.date);
  const lastDay = options.dates.at(-1);

  return (
    <View style={{ gap: space[3] }}>
      <View accessibilityRole="radiogroup" accessibilityLabel="When" style={{ flexDirection: "row", gap: space[3] }}>
        <View style={{ flex: 1 }}>
          <OptionCard title="Urgent · now" hint="24h standby rate" selected={value.urgency === "URGENT"} onPress={() => onChange({ urgency: "URGENT" })} />
        </View>
        <View style={{ flex: 1 }}>
          <OptionCard
            title="Schedule"
            hint={lastDay ? `Up to ${dayLabel(lastDay.date)}` : "Pick a day"}
            selected={value.urgency === "SCHEDULED"}
            onPress={() => onChange({ urgency: "SCHEDULED", date: value.date ?? options.dates[0]?.date, timeSlot: value.timeSlot })}
          />
        </View>
      </View>

      {value.urgency === "SCHEDULED" ? (
        <Frame framed={framed}>
          <View style={{ gap: space[2] }}>
            <AppText variant="xs" overline tone="textMuted">
              Day
            </AppText>
            {/* Framed: the row scrolls right to the card's edges (it isn't cut at the card's padding). */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              accessibilityRole="radiogroup"
              accessibilityLabel="Day"
              style={framed ? { marginHorizontal: -space[4] } : undefined}
              contentContainerStyle={framed ? { paddingHorizontal: space[4] } : undefined}
            >
              <View style={{ flexDirection: "row", gap: space[2] }}>
                {options.dates.map((d) => {
                  const chip = dayChip(d.date);
                  const selected = d.date === value.date;
                  return (
                    <ChoiceChip
                      key={d.date}
                      label={chip.weekday}
                      sublabel={chip.day}
                      selected={selected}
                      accessibilityLabel={`${dayLabel(d.date)}${chip.weekday === "Today" || chip.weekday === "Tomorrow" ? `, ${chip.day}` : ""}`}
                      // Keep the window if it's open on the new day too.
                      onPress={() => onChange({ urgency: "SCHEDULED", date: d.date, timeSlot: value.timeSlot && d.timeSlots.includes(value.timeSlot) ? value.timeSlot : undefined })}
                      minWidth={size.tapTarget * 2}
                    />
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <View style={{ gap: space[2] }}>
            <AppText variant="xs" overline tone="textMuted">
              Time
            </AppText>
            <View accessibilityRole="radiogroup" accessibilityLabel="Time" style={{ flexDirection: "row", gap: space[2] }}>
              {options.timeSlots.map((s) => {
                const open = !!day?.timeSlots.includes(s.id);
                return (
                  <View key={s.id} style={{ flex: 1 }}>
                    <ChoiceChip
                      label={s.label}
                      accessibilityLabel={open ? s.label : `${s.label}, too soon to book today`}
                      selected={open && value.timeSlot === s.id}
                      disabled={!open}
                      onPress={() => onChange({ ...value, urgency: "SCHEDULED", timeSlot: s.id })}
                    />
                  </View>
                );
              })}
            </View>
            {error ? (
              <AppText variant="xs" tone="danger" accessibilityLiveRegion="polite">
                {error}
              </AppText>
            ) : day && day.timeSlots.length < options.timeSlots.length ? (
              <AppText variant="xs" tone="textMuted">
                Times starting within the next hour can’t be booked for today. Need someone now? Choose Urgent.
              </AppText>
            ) : null}
          </View>
        </Frame>
      ) : (
        <AppText variant="xs" tone="textMuted">
          {`We’ll send it to every nearby ${tradeName} now. The 24h standby rate is part of their quote.`}
        </AppText>
      )}
    </View>
  );
}

/** The day and time rows' container: a Card when framed, otherwise a plain stack. */
function Frame({ framed, children }: { framed: boolean; children: React.ReactNode }) {
  return framed ? <Card style={{ gap: space[4] }}>{children}</Card> : <View style={{ gap: space[4] }}>{children}</View>;
}

/**
 * A day or time-window chip: selected = 2px primary border on primary-subtle (like the option card).
 * Disabled chips are muted with a dashed border and can't be pressed.
 */
function ChoiceChip({
  label,
  sublabel,
  selected,
  disabled = false,
  onPress,
  accessibilityLabel,
  minWidth,
}: {
  label: string;
  sublabel?: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  minWidth?: number;
}) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={accessibilityLabel ?? (sublabel ? `${label}, ${sublabel}` : label)}
      disabled={disabled}
      onPress={onPress}
      style={{
        minWidth,
        minHeight: size.tapTarget,
        paddingVertical: space[2],
        paddingHorizontal: space[2],
        borderRadius: radius.md,
        borderWidth: selected ? 2 : 1,
        borderStyle: disabled ? "dashed" : "solid",
        borderColor: selected ? color.primary : disabled ? color.borderStrong : color.border,
        backgroundColor: selected ? color.primarySubtle : disabled ? color.surfaceMuted : color.surface,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <AppText variant="sm" weight={600} tone={disabled ? "textMuted" : "text"} style={{ textAlign: "center" }}>
        {label}
      </AppText>
      {sublabel ? (
        <AppText variant="xs" tone="textMuted" style={{ textAlign: "center" }}>
          {sublabel}
        </AppText>
      ) : null}
    </Pressable>
  );
}
