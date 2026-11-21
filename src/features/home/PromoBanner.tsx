import { Pressable, View } from "react-native";
import { AppText } from "@/components";
import { Icon } from "@/components/Icon";
import { radius, size, space, useTheme } from "@/theme";

export interface Promo {
  overline: string;
  title: string;
  body: string;
}

/**
 * The launch promo. The amount isn't decided yet, so it stays a bracketed placeholder
 * (design-system rule: never invent prices). Set to null to hide the banner.
 */
export const LAUNCH_PROMO: Promo | null = {
  overline: "Launch promo",
  title: "[PROMO] off your first job",
  body: "Credits land in your HandySG wallet.",
};

/** The banner, with an X in the top-right corner that hides it (`onDismiss`). */
export function PromoBanner({ promo, onDismiss }: { promo: Promo; onDismiss: () => void }) {
  const { color } = useTheme();
  return (
    <View style={{ backgroundColor: color.primary, borderRadius: radius.lg, flexDirection: "row", alignItems: "flex-start" }}>
      {/* Read as one sentence by screen readers; the close button stays separately reachable. */}
      <View
        accessible
        accessibilityLabel={`${promo.overline}. ${promo.title}. ${promo.body}`}
        style={{ flex: 1, padding: space[4], paddingRight: 0, gap: space[1] }}
      >
        <AppText overline tone="onPrimary">
          {promo.overline}
        </AppText>
        <AppText variant="lg" tone="onPrimary">
          {promo.title}
        </AppText>
        <AppText variant="sm" tone="onPrimary">
          {promo.body}
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Close ${promo.overline.toLowerCase()}`}
        onPress={onDismiss}
        hitSlop={4}
        style={({ pressed }) => ({
          width: size.tapTarget,
          height: size.tapTarget,
          margin: space[1],
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Icon name="close" size={size.iconMd} color={color.onPrimary} />
      </Pressable>
    </View>
  );
}
