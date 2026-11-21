import { useRouter, type Href } from "expo-router";
import { Pressable, View } from "react-native";
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
}

/**
 * The app's own top bar, used on every pushed page and modal instead of the native Stack
 * header (which shows route names like "(tabs)"). Design system "App bar": color-surface,
 * 1px bottom color-border, 44px back button, title text-xl/600.
 */
export function AppBar({ title, parent, action = "back", fallbackHref = "/" }: AppBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { color } = useTheme();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(fallbackHref));
  const label = action === "close" ? "Close" : parent ? `Back to ${parent}` : "Back";

  return (
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
    </View>
  );
}
