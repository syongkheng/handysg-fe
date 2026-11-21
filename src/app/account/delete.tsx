import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { accountApi } from "@/api/account";
import { ApiError } from "@/api/ApiError";
import { authApi } from "@/api/auth";
import { useSessionActions } from "@/auth/SessionProvider";
import { AppBar, AppText, Button, Card, Icon, Screen, TextField, TextLink } from "@/components";
import { DangerDialog } from "@/features/account/DangerDialog";
import { SignedInOnly } from "@/features/account/SignedInOnly";
import { authErrorMessage } from "@/features/auth/authErrors";
import { Notice } from "@/features/auth/Notice";
import { OtpInput, OTP_LENGTH } from "@/features/auth/OtpInput";
import { StepHeader } from "@/features/auth/StepHeader";
import { size, space, useTheme } from "@/theme";

type Phase = "review" | "password" | "code" | "done";

const RESEND_COOLDOWN_SECONDS = 60;

const WHAT_GOES = ["Your username, email and password", "Your saved addresses", "Your sign-ins on every device"];

/**
 * Delete account: review what's removed → a danger dialog to confirm → password → the 6-digit
 * code emailed to the account → a final red button. The server anonymises and deletes the data
 * and signs out every device; the username and email can then be used again.
 */
export default function DeleteAccountScreen() {
  const router = useRouter();
  const { color } = useTheme();
  const { getAccessToken, signOut } = useSessionActions();
  const [phase, setPhase] = useState<Phase>("review");
  const [dialog, setDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [challenge, setChallenge] = useState<{ id: string; sentTo: string }>();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendCode() {
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const ch = await accountApi.startDeletion(password, getAccessToken());
      setPassword("");
      setChallenge({ id: ch.challengeId, sentTo: ch.sentTo });
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setPhase("code");
    } catch (e) {
      setError(e instanceof ApiError && e.code === "incorrect_password" ? "That password isn’t right." : authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!challenge) return;
    setError(undefined);
    try {
      const ch = await authApi.resendOtp(challenge.id);
      setChallenge({ id: ch.challengeId, sentTo: ch.sentTo });
      setCode("");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (e) {
      setError(authErrorMessage(e));
    }
  }

  async function deleteAccount() {
    if (!challenge || code.length !== OTP_LENGTH) return;
    setBusy(true);
    setError(undefined);
    try {
      await accountApi.confirmDeletion(challenge.id, code, getAccessToken());
      // Show the done screen first, so the guest log-in prompt never flashes in between.
      setPhase("done");
      await signOut(); // the server already ended every session; this clears the tokens on this device
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === "otp_invalid"
          ? "That code is wrong or has expired. Try again, or send a new one."
          : authErrorMessage(e),
      );
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  if (phase === "done") {
    return (
      <Screen header={<AppBar title="Account deleted" action="close" onBack={() => router.replace("/")} />} gap={space[6]}>
        <StepHeader icon="checkCircle" title="Your account has been deleted">
          Your personal data has been removed and you’ve been signed out on every device. We’ve emailed you a confirmation.
        </StepHeader>
        <Button label="Back to Home" onPress={() => router.replace("/")} />
      </Screen>
    );
  }

  return (
    <Screen header={<AppBar title="Delete account" parent="Profile" fallbackHref="/profile" />} gap={space[6]}>
      <SignedInOnly>
        {phase === "review" ? (
          <>
            <StepHeader icon="alert" title="Delete your account?">
              This permanently removes your HandySG account. It can’t be undone.
            </StepHeader>
            <Card>
              <AppText weight={600}>What gets deleted</AppText>
              {WHAT_GOES.map((item) => (
                <View key={item} style={{ flexDirection: "row", gap: space[2], alignItems: "center" }}>
                  <Icon name="close" size={size.iconSm} color={color.danger} />
                  <AppText style={{ flex: 1 }}>{item}</AppText>
                </View>
              ))}
              <AppText variant="xs" tone="textMuted">
                Your username and email are freed, so they can be used to sign up again.
              </AppText>
            </Card>
            <Notice tone="info" title="Want a copy first?">
              <TextLink label="Export my data" variant="sm" onPress={() => router.push("/account/export")} />
            </Notice>
            <Button label="Delete my account" variant="danger" onPress={() => setDialog(true)} />
            <DangerDialog
              visible={dialog}
              title="Are you sure?"
              message="Your account and personal data will be permanently deleted. You’ll confirm with your password and a code sent to your email."
              confirmLabel="Yes, continue"
              onCancel={() => setDialog(false)}
              onConfirm={() => {
                setDialog(false);
                setPhase("password");
              }}
            />
          </>
        ) : null}

        {phase === "password" ? (
          <>
            <StepHeader icon="lock" title="Confirm it’s you">
              Enter your password. We’ll then email you a 6-digit code to finish deleting your account.
            </StepHeader>
            <TextField
              label="Password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setError(undefined);
              }}
              secureToggle
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="send"
              onSubmitEditing={sendCode}
              error={error}
              autoFocus
            />
            <Button label="Send code" variant="danger" onPress={sendCode} loading={busy} />
          </>
        ) : null}

        {phase === "code" && challenge ? (
          <>
            <StepHeader icon="shield" title="Enter the code">
              <AppText tone="textMuted">
                We sent a 6-digit code to <AppText weight={600}>{challenge.sentTo}</AppText>. Entering it deletes your account.
              </AppText>
            </StepHeader>
            <View style={{ gap: space[3] }}>
              <OtpInput
                value={code}
                onChange={(d) => {
                  setCode(d);
                  if (d) setError(undefined);
                }}
                error={!!error}
                disabled={busy}
                autoFocus
              />
              {error ? (
                <AppText variant="sm" tone="danger" accessibilityRole="alert">
                  {error}
                </AppText>
              ) : null}
            </View>
            {/* No auto-submit here: deleting needs a deliberate tap on the red button. */}
            <Button
              label="Delete my account permanently"
              variant="danger"
              onPress={deleteAccount}
              loading={busy}
              disabled={code.length !== OTP_LENGTH}
            />
            <View style={{ alignItems: "center" }}>
              {cooldown > 0 ? (
                <AppText variant="sm" tone="textMuted">
                  Didn’t get it? Send a new code in {cooldown}s
                </AppText>
              ) : (
                <TextLink label="Send a new code" onPress={resend} />
              )}
            </View>
          </>
        ) : null}
      </SignedInOnly>
    </Screen>
  );
}
