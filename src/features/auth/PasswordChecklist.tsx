import { View } from "react-native";
import { AppText, Icon } from "@/components";
import { size, space, useTheme } from "@/theme";
import { PASSWORD_RULES } from "./passwordRules";

/**
 * Live password rules under the password field: each line ticks green as it's met. Rules not
 * met yet stay neutral (not red), so the list guides rather than scolds while typing.
 */
export function PasswordChecklist({ password }: { password: string }) {
  const { color } = useTheme();
  return (
    <View accessibilityLabel="Password requirements" style={{ gap: space[1] }}>
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <View
            key={rule.id}
            accessible
            accessibilityLabel={`${rule.label}, ${met ? "done" : "not yet"}`}
            style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}
          >
            <Icon name={met ? "checkCircle" : "circle"} size={size.iconSm} color={met ? color.success : color.borderStrong} />
            <AppText variant="sm" tone={met ? "successText" : "textMuted"}>
              {rule.label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}
