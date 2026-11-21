import { View } from "react-native";
import { AppText, Card, TextLink } from "@/components";
import { space } from "@/theme";

/** The username being used, read-only, with a "Change" link (log-in password step, sign-up step 1). */
export function UsernameRow({ username, onChange }: { username: string; onChange: () => void }) {
  return (
    <Card style={{ flexDirection: "row", alignItems: "center", paddingVertical: space[1] }}>
      <View style={{ flex: 1 }}>
        <AppText variant="xs" tone="textMuted">
          Username
        </AppText>
        <AppText variant="md">{username}</AppText>
      </View>
      <TextLink label="Change" accessibilityLabel="Change username" onPress={onChange} />
    </Card>
  );
}
