import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState, type ComponentRef } from "react";
import type { TextInput } from "react-native";
import { ApiError } from "@/api/ApiError";
import { authApi } from "@/api/auth";
import { knownReason } from "@/auth/loginReasons";
import { AppBar, AppText, Button, Card, Screen, TextField, TextLink } from "@/components";
import { authErrorMessage } from "@/features/auth/authErrors";
import { Notice } from "@/features/auth/Notice";
import { USERNAME_PATTERN } from "@/features/auth/passwordRules";
import { useRegisterDraft } from "@/features/auth/RegisterDraft";
import { StepHeader } from "@/features/auth/StepHeader";
import { UsernameRow } from "@/features/auth/UsernameRow";
import { useCloseAuthFlow } from "@/features/auth/useCloseAuthFlow";
import { space } from "@/theme";

type Phase = "username" | "password" | "notFound";

/**
 * Identifier-first log-in. Step one asks only for the username:
 *   - it exists  → the password field appears → email code (/verify) → signed in
 *   - it doesn't → offer to create an account with that username (/register)
 * `reason` completes "Log in to …" and is only shown when it's one the app itself sends.
 */
export default function LoginScreen() {
  const router = useRouter();
  const close = useCloseAuthFlow();
  const { reset } = useRegisterDraft();
  const reason = knownReason(useLocalSearchParams<{ reason?: string }>().reason);

  const [phase, setPhase] = useState<Phase>("username");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  const trimmed = username.trim();

  async function onContinue() {
    if (!trimmed) {
      setError("Enter your username.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const { exists } = await authApi.identify(trimmed);
      setPhase(exists ? "password" : "notFound");
      if (exists) setTimeout(() => passwordRef.current?.focus(), 50);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function onLogIn() {
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const ch = await authApi.login(trimmed, password);
      setPassword("");
      router.push({
        pathname: "/verify",
        params: { challengeId: ch.challengeId, sentTo: ch.sentTo, purpose: ch.purpose },
      });
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === "invalid_login_credentials" ? "That password isn't right. Try again." : authErrorMessage(e),
      );
    } finally {
      setBusy(false);
    }
  }

  function changeUsername() {
    setPhase("username");
    setPassword("");
    setError(undefined);
  }

  function createAccount() {
    reset(trimmed);
    router.push("/register");
  }

  const canSignUp = USERNAME_PATTERN.test(trimmed);

  return (
    <Screen header={<AppBar title="Log in" action="close" onBack={close} />} gap={space[6]}>
      <StepHeader icon={phase === "password" ? "lock" : "profile"} title={reason ? `Log in to ${reason}` : "Log in or sign up"}>
        {phase === "password" ? "Enter your password. We’ll then email you a 6-digit code." : "Enter your username to continue."}
      </StepHeader>

      {phase === "username" ? (
        <>
          <TextField
            label="Username"
            value={username}
            onChangeText={(t) => {
              setUsername(t);
              setError(undefined);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            returnKeyType="next"
            onSubmitEditing={onContinue}
            maxLength={30}
            error={error}
            autoFocus
          />
          <Button label="Continue" onPress={onContinue} loading={busy} />
        </>
      ) : null}

      {phase === "password" ? (
        <>
          <UsernameRow username={trimmed} onChange={changeUsername} />
          <TextField
            ref={passwordRef}
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
            returnKeyType="go"
            onSubmitEditing={onLogIn}
            error={error}
          />
          <Button label="Log in" onPress={onLogIn} loading={busy} />
        </>
      ) : null}

      {phase === "notFound" ? (
        <Card>
          <AppText variant="md" accessibilityRole="header">
            No account called “{trimmed}”
          </AppText>
          {canSignUp ? (
            <>
              <AppText tone="textMuted">Create one with this username. It takes about a minute.</AppText>
              <Button label="Create account" onPress={createAccount} height="tall" />
            </>
          ) : (
            <Notice tone="info">To sign up, pick a username of 3–30 letters, numbers, dots (.) or underscores (_).</Notice>
          )}
          <TextLink label="Try a different username" onPress={changeUsername} />
        </Card>
      ) : null}
    </Screen>
  );
}
