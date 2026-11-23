import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText, Button } from "@/components";
import { space, useTheme } from "@/theme";
import { formatFee } from "./jobFormat";

/**
 * Design system "Bottom action bar", pinned under the booking form: the fixed fee (shown before the
 * customer commits), the "you approve the quote first" line, and the primary button, always in reach.
 */
export function BookingBar({ feeCents, tradeName, label, onPress, loading }: { feeCents: number; tradeName: string; label: string; onPress: () => void; loading: boolean }) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: color.surface,
        borderTopWidth: 1,
        borderTopColor: color.border,
        paddingHorizontal: space[5],
        paddingTop: space[3],
        paddingBottom: Math.max(insets.bottom, space[4]),
        gap: space[3],
      }}
    >
      <View style={{ gap: space[1] }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: space[3] }}>
          <AppText weight={600}>Deposit / call-out fee</AppText>
          <AppText variant="lg" weight={700}>
            {formatFee(feeCents)}
          </AppText>
        </View>
        <AppText variant="xs" tone="textMuted">
          {`Repair cost is quoted by the ${tradeName}. You approve it before any work starts.`}
        </AppText>
      </View>
      <Button label={label} onPress={onPress} loading={loading} />
    </View>
  );
}
