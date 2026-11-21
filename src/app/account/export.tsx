import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { accountApi, type ExportAccepted, type ExportFormat } from "@/api/account";
import { useSessionActions } from "@/auth/SessionProvider";
import { AppBar, Button, Screen } from "@/components";
import { OptionCard } from "@/features/account/OptionCard";
import { SignedInOnly } from "@/features/account/SignedInOnly";
import { authErrorMessage } from "@/features/auth/authErrors";
import { Notice } from "@/features/auth/Notice";
import { StepHeader } from "@/features/auth/StepHeader";
import { space } from "@/theme";

/**
 * Export my data (PDPA access request). The user picks a format; the file is built on the server
 * and emailed to their verified address, so this page only starts it.
 */
export default function ExportScreen() {
  const router = useRouter();
  const { getAccessToken } = useSessionActions();
  const [format, setFormat] = useState<ExportFormat>("READABLE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<ExportAccepted>();

  async function onExport() {
    setBusy(true);
    setError(undefined);
    try {
      setDone(await accountApi.requestExport(format, getAccessToken()));
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen header={<AppBar title="Export my data" parent="Profile" fallbackHref="/profile" />} gap={space[6]}>
      <SignedInOnly>
        <StepHeader icon="mail" title="Get a copy of your data">
          Everything HandySG stores about your account, as a file sent to your email.
        </StepHeader>

        {done ? (
          <>
            <Notice tone="success" title="Export requested">
              {`We’re preparing your file and will email it to ${done.sentTo}. It can take a while, so check back later (and your spam folder).`}
            </Notice>
            <Button label="Done" onPress={() => (router.canGoBack() ? router.back() : router.replace("/profile"))} />
          </>
        ) : (
          <>
            <View accessibilityRole="radiogroup" accessibilityLabel="File format" style={{ gap: space[3] }}>
              <OptionCard
                title="Readable"
                hint="Encrypted details, like your address, are decrypted so you can read them. Only this file is decrypted: we keep storing them encrypted."
                selected={format === "READABLE"}
                onPress={() => setFormat("READABLE")}
              />
              <OptionCard
                title="As HandySG stores it"
                hint="Exactly what’s in our database. Encrypted details stay encrypted and can’t be read without our key."
                selected={format === "STORED"}
                onPress={() => setFormat("STORED")}
              />
            </View>

            <Notice tone="info" title="This can take a while">
              We’ll email the file to your verified email address when it’s ready. You can request one export every 24 hours.
            </Notice>

            {error ? <Notice title="Couldn’t start the export">{error}</Notice> : null}
            <Button label="Email my data" onPress={onExport} loading={busy} />
          </>
        )}
      </SignedInOnly>
    </Screen>
  );
}
