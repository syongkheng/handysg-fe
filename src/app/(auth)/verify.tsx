import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { ApiError } from "@/api/ApiError";
import { authApi, type OtpPurpose } from "@/api/auth";
import { useSessionActions } from "@/auth/SessionProvider";
import { AppBar, AppText, Button, Screen, TextLink } from "@/components";
import { authErrorMessage } from "@/features/auth/authErrors";
import { OtpInput, OTP_LENGTH } from "@/features/auth/OtpInput";
import { registerStep, useRegisterDraft } from "@/features/auth/RegisterDraft";
import { StepHeader } from "@/features/auth/StepHeader";
import { useCloseAuthFlow } from "@/features/auth/useCloseAuthFlow";
import { space } from "@/theme";

/** Matches the backend's OTP_RESEND_COOLDOWN_SECONDS. */
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Enter the 6-digit email code: step 3 of sign-up, and the last step of every log-in.
 * The code submits itself once all 6 boxes are filled (typed, pasted or autofilled).
 *
 * After verifying, the user is signed in. Sign-up then offers the (optional) address step;
 * a log-in closes the modal, back to where they started.
 */
export default function VerifyScreen() {
  const router = useRouter();
  const close = useCloseAuthFlow();
  const { signIn } = useSessionActions();
  const { reset } = useRegisterDraft();
  const params = useLocalSearchParams<{ challengeId?: string; sentTo?: string; purpose?: OtpPurpose; flow?: string }>();
  const fromRegister = params.flow === "register";

  const [challengeId, setChallengeId] = useState(params.challengeId ?? "");
  const [sentTo, setSentTo] = useState(params.sentTo ?? "your email");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const inFlight = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function verify(value: string) {
    if (value.length !== OTP_LENGTH || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const tokens = await authApi.verifyOtp(challengeId, value);
      await signIn(tokens);
      reset();
      if (fromRegister) router.replace({ pathname: "/register/address", params: { flow: "register" } });
      else close();
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === "otp_invalid"
          ? "That code is wrong or has expired. Try again, or send a new one."
          : authErrorMessage(e),
      );
      setCode("");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function resend() {
    setError(undefined);
    setNotice(undefined);
    try {
      const ch = await authApi.resendOtp(challengeId);
      setChallengeId(ch.challengeId);
      setSentTo(ch.sentTo);
      setCode("");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setNotice(`New code sent to ${ch.sentTo}.`);
    } catch (e) {
      setError(authErrorMessage(e));
    }
  }

  if (!challengeId) {
    return (
      <Screen header={<AppBar title="Verify email" action="close" onBack={close} />}>
        <AppText tone="textMuted">This code request has expired. Log in again to get a new code.</AppText>
        <Button label="Go to log in" onPress={() => router.replace("/login")} />
      </Screen>
    );
  }

  return (
    <Screen
      header={
        <AppBar
          title={fromRegister ? "Create account" : "Log in"}
          parent={fromRegister ? "Email" : undefined}
          step={fromRegister ? registerStep("Verify email") : undefined}
        />
      }
      gap={space[6]}
    >
      <StepHeader icon="shield" title={params.purpose === "LOGIN" ? "Enter your code" : "Check your email"}>
        <AppText tone="textMuted">
          We sent a 6-digit code to <AppText weight={600}>{sentTo}</AppText>. It expires in 10 minutes.
        </AppText>
      </StepHeader>

      <View style={{ gap: space[3] }}>
        <OtpInput
          value={code}
          onChange={(d) => {
            setCode(d);
            if (d) setError(undefined);
          }}
          onComplete={verify}
          error={!!error}
          disabled={busy}
          autoFocus
        />
        <AppText
          variant="sm"
          tone={error ? "danger" : "textMuted"}
          accessibilityLiveRegion="polite"
          accessibilityRole={error ? "alert" : undefined}
        >
          {error ?? notice ?? "Can’t find it? Check your spam or promotions folder."}
        </AppText>
      </View>

      <Button label="Verify" onPress={() => verify(code)} loading={busy} disabled={code.length !== OTP_LENGTH} />

      <View style={{ alignItems: "center" }}>
        {cooldown > 0 ? (
          <AppText variant="sm" tone="textMuted">
            Didn’t get it? Send a new code in {cooldown}s
          </AppText>
        ) : (
          <TextLink label="Send a new code" onPress={resend} />
        )}
      </View>
    </Screen>
  );
}
