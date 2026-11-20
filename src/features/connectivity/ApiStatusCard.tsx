import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { ApiError } from "@/api/ApiError";
import { getConnectivity, type Connectivity } from "@/api/connectivity";
import { AppText, Button, Card, StatusPill } from "@/components";
import { env } from "@/config/env";
import { space, useTheme } from "@/theme";

type State =
  | { kind: "loading" }
  | { kind: "ok"; data: Connectivity }
  | { kind: "error"; message: string };

/** Calls GET /connectivity on mount and on "Check again". */
export function ApiStatusCard() {
  const { color } = useTheme();
  const [state, setState] = useState<State>({ kind: "loading" });
  // Bumping this re-runs the effect. The cleanup aborts the previous request, so only the newest one updates the card.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getConnectivity(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ kind: "ok", data });
      },
      (err: unknown) => {
        if (controller.signal.aborted) return;
        setState({ kind: "error", message: err instanceof ApiError ? err.message : "Something went wrong. Try again." });
      },
    );
    return () => controller.abort();
  }, [attempt]);

  const checkAgain = () => {
    setState({ kind: "loading" });
    setAttempt((n) => n + 1);
  };

  return (
    <Card accessibilityLiveRegion="polite">
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space[2] }}>
        <AppText variant="md">API connection</AppText>
        {state.kind === "loading" && <StatusPill label="Checking" tone="neutral" />}
        {state.kind === "ok" && <StatusPill label="Connected" tone="success" />}
        {state.kind === "error" && <StatusPill label="Offline" tone="danger" />}
      </View>

      {state.kind === "loading" && <ActivityIndicator color={color.primary} accessibilityLabel="Checking the API connection" />}

      {state.kind === "ok" && (
        <View style={{ gap: space[2] }}>
          <Row label="Environment" value={state.data.color} />
          <Row label="Server time" value={state.data.timestamp} />
        </View>
      )}

      {state.kind === "error" && <AppText tone="danger">{state.message}</AppText>}

      <AppText variant="xs" tone="textMuted" selectable>
        {env.apiUrl}
      </AppText>

      <Button label="Check again" variant="secondary" onPress={checkAgain} loading={state.kind === "loading"} />
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space[3] }}>
      <AppText tone="textMuted">{label}</AppText>
      <AppText weight={600} style={{ flexShrink: 1, textAlign: "right" }}>
        {value}
      </AppText>
    </View>
  );
}
