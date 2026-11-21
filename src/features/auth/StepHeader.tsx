import { View } from "react-native";
import { AppText, Icon, type IconName } from "@/components";
import { radius, size, space, useTheme } from "@/theme";

/**
 * The top of each log-in / sign-up step: a 44px icon chip (primary-subtle, like the trade tiles'
 * chips), the step's question in text-2xl, and one muted line saying why it's asked.
 */
export function StepHeader({ icon, title, children }: { icon: IconName; title: string; children?: React.ReactNode }) {
  const { color } = useTheme();
  return (
    <View style={{ gap: space[3] }}>
      <View
        style={{
          width: size.tapTarget,
          height: size.tapTarget,
          borderRadius: radius.md,
          backgroundColor: color.primarySubtle,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={size.iconLg} color={color.link} />
      </View>
      <View style={{ gap: space[2] }}>
        <AppText variant="2xl" accessibilityRole="header">
          {title}
        </AppText>
        {children ? typeof children === "string" ? <AppText tone="textMuted">{children}</AppText> : children : null}
      </View>
    </View>
  );
}
