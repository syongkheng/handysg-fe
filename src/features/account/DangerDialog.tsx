import { Modal, Pressable, View } from "react-native";
import { AppText, Button, Icon } from "@/components";
import { radius, size, space, useTheme } from "@/theme";

/**
 * A blocking confirmation for a risky action. `tone` "danger" (default) for destructive actions that
 * can't be undone (red); "warning" for risky ones that can be recovered from (amber).
 * Scrim, a card with an alert icon, what will
 * happen, and Cancel / a red confirm button. Drawn by us (not Alert.alert) so it looks the same
 * on iOS, Android and web. Tapping the scrim cancels.
 */
export function DangerDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  /** The safe choice's label; "Cancel" by default ("Keep job" when the action itself is a cancel). */
  cancelLabel?: string;
  tone?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { color } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        accessibilityLabel={cancelLabel}
        onPress={onCancel}
        style={{ flex: 1, backgroundColor: color.scrim, justifyContent: "center", padding: space[5] }}
      >
        <Pressable
          accessibilityViewIsModal
          accessibilityRole="alert"
          onPress={() => {}}
          style={{ backgroundColor: color.surface, borderRadius: radius.lg, padding: space[5], gap: space[4] }}
        >
          <View
            style={{
              width: size.tapTarget,
              height: size.tapTarget,
              borderRadius: radius.full,
              backgroundColor: tone === "warning" ? color.warningSubtle : color.dangerSubtle,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="alert" size={size.iconLg} color={tone === "warning" ? color.warning : color.danger} />
          </View>
          <View style={{ gap: space[2] }}>
            <AppText variant="xl" weight={600} accessibilityRole="header">
              {title}
            </AppText>
            <AppText tone="textMuted">{message}</AppText>
          </View>
          <View style={{ gap: space[2] }}>
            <Button label={confirmLabel} variant={tone} onPress={onConfirm} />
            <Button label={cancelLabel} variant="secondary" onPress={onCancel} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
