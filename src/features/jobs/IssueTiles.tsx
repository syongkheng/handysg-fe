import { Pressable, View } from "react-native";
import { AppText, Icon, type IconName } from "@/components";
import type { Trade, TradeId } from "@/features/home/trades";
import { radius, size, space, useTheme } from "@/theme";

/** Common problems per trade, offered as tiles on the first booking step. */
export const COMMON_ISSUES: Record<TradeId, readonly { label: string; icon: IconName }[]> = {
  PLUMBER: [
    { label: "Leaking pipe", icon: "drop" },
    { label: "Choked sink or toilet", icon: "filter" },
    { label: "Low water pressure", icon: "activity" },
    { label: "Water heater", icon: "thermometer" },
    { label: "Tap or shower", icon: "shower" },
    { label: "Something else", icon: "tool" },
  ],
  ELECTRICIAN: [
    { label: "Power trips", icon: "power" },
    { label: "Lights not working", icon: "sun" },
    { label: "Socket or switch", icon: "toggle" },
    { label: "Water heater", icon: "thermometer" },
    { label: "New installation", icon: "bolt" },
    { label: "Something else", icon: "tool" },
  ],
  LOCKSMITH: [
    { label: "Locked out", icon: "lock" },
    { label: "Digital lock", icon: "grid" },
    { label: "Change a lock", icon: "refresh" },
    { label: "Key stuck or broken", icon: "key" },
    { label: "Gate or grille", icon: "gate" },
    { label: "Something else", icon: "tool" },
  ],
};

/** The tile that doesn't write anything: the customer describes the problem themselves. */
export const SOMETHING_ELSE = "Something else";

/**
 * Tapping a tile writes its sentence into the description ("Leaking pipe."), or takes it out again
 * if it's already there. The description is the one source of truth: a tile shows as picked while
 * its sentence is in the text, so editing the text updates the tiles too.
 */
export function toggleIssue(description: string, issue: string): string {
  const sentence = `${issue}.`;
  if (description.includes(sentence)) {
    return description.replace(sentence, "").replace(/ {2,}/g, " ").trim();
  }
  const trimmed = description.trimEnd();
  return trimmed ? `${trimmed} ${sentence}` : sentence;
}

/** Which tiles are picked, from the description (plus "Something else", which has no sentence). */
export function pickedIssues(description: string, somethingElse: boolean): string[] {
  // Labels repeat across trades ("Water heater"), so de-duplicate.
  const labels = [...new Set(Object.values(COMMON_ISSUES).flatMap((list) => list.map((i) => i.label)))];
  const picked = labels.filter((label) => label !== SOMETHING_ELSE && description.includes(`${label}.`));
  return somethingElse ? [...picked, SOMETHING_ELSE] : picked;
}

/**
 * Issue tiles: a compact two-column grid of row-shaped cards (icon chip, label, check circle), so
 * the whole first step fits on one screen. Several can be picked; a picked tile has a 2px primary
 * border on primary-subtle and a filled check (the check's space is always reserved, so picking
 * never shifts anything). Tiles press in slightly when tapped.
 */
export function IssueTiles({ trade, picked, onToggle }: { trade: Trade; picked: readonly string[]; onToggle: (label: string) => void }) {
  const issues = COMMON_ISSUES[trade.id];
  const rows: (typeof issues)[number][][] = [];
  for (let i = 0; i < issues.length; i += 2) rows.push(issues.slice(i, i + 2));
  return (
    <View accessibilityLabel="Common problems" style={{ gap: space[3] }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: "row", gap: space[3] }}>
          {row.map((issue) => (
            <IssueTile key={issue.label} trade={trade} label={issue.label} icon={issue.icon} picked={picked.includes(issue.label)} onPress={() => onToggle(issue.label)} />
          ))}
        </View>
      ))}
    </View>
  );
}

function IssueTile({ trade, label, icon, picked, onPress }: { trade: Trade; label: string; icon: IconName; picked: boolean; onPress: () => void }) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: picked }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        minHeight: size.tapTarget + space[5],
        // A picked tile's border is 1px thicker, so its padding is 1px less: the content never moves.
        paddingHorizontal: picked ? space[3] - 1 : space[3],
        paddingVertical: picked ? space[2] - 1 : space[2],
        gap: space[2],
        borderRadius: radius.lg,
        borderWidth: picked ? 2 : 1,
        borderColor: picked ? color.primary : color.border,
        backgroundColor: picked ? color.primarySubtle : pressed ? color.surfaceMuted : color.surface,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <View
        style={{
          width: size.iconLg + space[3],
          height: size.iconLg + space[3],
          borderRadius: radius.md,
          // On a picked (primary-subtle) tile the trade chip would blend in, so it sits on surface instead.
          backgroundColor: picked ? color.surface : color[trade.chip],
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={size.iconMd} color={color[trade.glyph]} />
      </View>
      <AppText variant="sm" weight={600} style={{ flex: 1 }}>
        {label}
      </AppText>
      {picked ? (
        <View style={{ width: size.iconMd, height: size.iconMd, borderRadius: radius.full, backgroundColor: color.primary, alignItems: "center", justifyContent: "center" }}>
          <Icon name="check" size={size.iconSm - 2} color={color.onPrimary} />
        </View>
      ) : (
        <View style={{ width: size.iconMd, height: size.iconMd, borderRadius: radius.full, borderWidth: 2, borderColor: color.borderStrong }} />
      )}
    </Pressable>
  );
}
