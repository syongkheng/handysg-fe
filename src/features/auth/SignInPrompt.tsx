import { View } from "react-native";
import { AppText, Button, Card } from "@/components";
import { Icon } from "@/components/Icon";
import { radius, size, space, useTheme } from "@/theme";

/**
 * Shown in place of signed-in-only content (your jobs, wallet, profile) when browsing as a guest.
 * `reason` completes "Log in to …".
 */
export function SignInPrompt({ title, reason, onLogIn }: { title: string; reason: string; onLogIn: () => void }) {
  const { color } = useTheme();
  return (
    <Card style={{ gap: space[4] }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space[3] }}>
        <View
          style={{
            width: size.tapTarget,
            height: size.tapTarget,
            borderRadius: radius.full,
            backgroundColor: color.surfaceMuted,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="lock" size={size.iconMd} color={color.textMuted} />
        </View>
        <View style={{ flex: 1, gap: space[1] }}>
          <AppText variant="md" weight={600}>
            {title}
          </AppText>
          <AppText variant="sm" tone="textMuted">
            Log in to {reason}.
          </AppText>
        </View>
      </View>
      <Button label="Log in" variant="secondary" height="tall" onPress={onLogIn} />
    </Card>
  );
}
