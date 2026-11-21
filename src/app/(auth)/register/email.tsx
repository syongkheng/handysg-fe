import { useRouter } from "expo-router";
import { useState } from "react";
import { ApiError } from "@/api/ApiError";
import { authApi } from "@/api/auth";
import { AppBar, Button, Screen, TextField, TextLink } from "@/components";
import { authErrorMessage } from "@/features/auth/authErrors";
import { Notice } from "@/features/auth/Notice";
import { EMAIL_PATTERN } from "@/features/auth/passwordRules";
import { registerStep, useRegisterDraft } from "@/features/auth/RegisterDraft";
import { StepHeader } from "@/features/auth/StepHeader";
import { space } from "@/theme";

/**
 * Sign-up step 2 of 4: the email. Continue creates the account (unverified) and sends the
 * 6-digit code; the next step enters it.
 */
export default function RegisterEmailStep() {
  const router = useRouter();
  const { draft, update } = useRegisterDraft();
  const [email, setEmail] = useState(draft.email);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [taken, setTaken] = useState<string>();
  const [problem, setProblem] = useState<{ message: string; usernameTaken?: boolean }>();

  const trimmed = email.trim().toLowerCase();
  const valid = EMAIL_PATTERN.test(trimmed) && trimmed.length <= 254;
  const error =
    taken && taken === trimmed
      ? "This email already has an account. Use another, or log in instead."
      : tried && !valid
        ? "Enter a valid email, like name@example.com."
        : undefined;

  async function onContinue() {
    setTried(true);
    setProblem(undefined);
    if (!valid || taken === trimmed) return;
    update({ email: trimmed });
    setBusy(true);
    try {
      const ch = await authApi.register({ username: draft.username, email: trimmed, password: draft.password });
      update({ password: "" }); // not needed any more; don't keep it in memory
      router.push({
        pathname: "/verify",
        params: { challengeId: ch.challengeId, sentTo: ch.sentTo, purpose: ch.purpose, flow: "register" },
      });
    } catch (e) {
      if (e instanceof ApiError && e.code === "email_already_registered") setTaken(trimmed);
      else if (e instanceof ApiError && e.code === "username_taken")
        setProblem({ message: `Someone has just taken “${draft.username}”. Pick another username.`, usernameTaken: true });
      else setProblem({ message: authErrorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen header={<AppBar title="Create account" parent="Password" step={registerStep("Email")} />} gap={space[6]}>
      <StepHeader icon="mail" title="What’s your email?">
        We’ll send a 6-digit code to verify it, so use an email you can open now.
      </StepHeader>

      <TextField
        label="Email"
        placeholder="name@example.com"
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          setProblem(undefined);
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        maxLength={254}
        returnKeyType="send"
        onSubmitEditing={onContinue}
        error={error}
        autoFocus
      />

      {taken === trimmed ? <TextLink label="Log in instead" onPress={() => router.dismissTo("/login")} /> : null}
      {problem ? <Notice title="Couldn’t create your account">{problem.message}</Notice> : null}

      {problem?.usernameTaken ? (
        <Button label="Change username" variant="secondary" onPress={() => router.dismissTo("/login")} />
      ) : (
        <Button label="Send code" onPress={onContinue} loading={busy} />
      )}
    </Screen>
  );
}
