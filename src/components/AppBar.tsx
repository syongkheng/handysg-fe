import { useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { size, space, useTheme } from "@/theme";
import { AppText } from "./AppText";
import { Icon } from "./Icon";

export interface AppBarProps {
  title: string;
  /**
   * Breadcrumb: the page this one was opened from ("Profile"). Shown small above the title
   * and used in the back button's label ("Back to Profile").
   */
  parent?: string;
  /** "back" (chevron) for pushed pages, "close" (X) for modals. */
  action?: "back" | "close";
  /** Where to go when there is no history to go back to (opened from a deep link). Defaults to "/". */
  fallbackHref?: Href;
  /** Replaces the default back/close behaviour (e.g. closing a whole multi-step flow). */
  onBack?: () => void;
  /** Multi-step flows: "Step 2 of 4" on the right and a 4px progress bar under the bar. */
  step?: { current: number; total: number };
}

/**
 * The app's own top bar, used on every pushed page and modal instead of the native Stack
 * header (which shows route names like "(tabs)"). Design system "App bar": color-surface,
 * 1px bottom color-border, 44px back button, title text-xl/600.
 */
export function AppBar({ title, parent, action = "back", fallbackHref = "/", onBack, step }: AppBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { color } = useTheme();
  const goBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace(fallbackHref)));
  const label = action === "close" ? "Close" : parent ? `Back to ${parent}` : "Back";

  return (
    <View style={{ backgroundColor: color.surface }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space[2],
          paddingTop: insets.top + space[2],
          paddingBottom: space[2],
          paddingLeft: Math.max(insets.left, space[2]),
          paddingRight: Math.max(insets.right, space[5]),
          backgroundColor: color.surface,
          borderBottomWidth: 1,
          borderBottomColor: color.border,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={goBack}
          hitSlop={4}
          style={({ pressed }) => ({
            width: size.tapTarget,
            height: size.tapTarget,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Icon name={action === "close" ? "close" : "chevronLeft"} size={22} color={color.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          {parent ? (
            <AppText variant="xs" tone="textMuted" numberOfLines={1}>
              {parent}
            </AppText>
          ) : null}
          <AppText variant="xl" weight={600} accessibilityRole="header" numberOfLines={1}>
            {title}
          </AppText>
        </View>
        {step ? (
          <AppText variant="xs" tone="textMuted">
            Step {step.current} of {step.total}
          </AppText>
        ) : null}
      </View>
      {step ? <StepProgress current={step.current} total={step.total} /> : null}
    </View>
  );
}

/**
 * The 4px progress bar under the App bar. Each step's page mounts its own bar, so it starts at
 * the previous step's width and grows to this one, which reads as moving forward.
 */
function StepProgress({ current, total }: { current: number; total: number }) {
  const { color } = useTheme();
  const [progress] = useState(() => new Animated.Value(Math.max(current - 1, 0) / total));

  useEffect(() => {
    Animated.timing(progress, { toValue: current / total, duration: 350, useNativeDriver: false }).start();
  }, [current, total, progress]);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current} of ${total}`}
      accessibilityValue={{ min: 0, max: total, now: current }}
      style={{ height: space[1], backgroundColor: color.border }}
    >
      <Animated.View
        style={{
          height: space[1],
          backgroundColor: color.primary,
          width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
        }}
      />
    </View>
  );
}
