import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { AppBar, AppText, Button, Screen, TextField } from "@/components";
import { PasswordChecklist } from "@/features/auth/PasswordChecklist";
import { PASSWORD_MAX_LENGTH, passwordMeetsRules } from "@/features/auth/passwordRules";
import { registerStep, useRegisterDraft } from "@/features/auth/RegisterDraft";
import { StepHeader } from "@/features/auth/StepHeader";
import { UsernameRow } from "@/features/auth/UsernameRow";
import { space } from "@/theme";

/** Sign-up step 1 of 4: choose a password (live checklist) and confirm it. */
export default function RegisterPasswordStep() {
  const router = useRouter();
  const { draft, update } = useRegisterDraft();
  const [password, setPassword] = useState(draft.password);
  const [confirm, setConfirm] = useState(draft.password);

  // Opened without a username (deep link, or the app was reloaded mid-flow): start at log-in.
  if (!draft.username) {
    return (
      <Screen header={<AppBar title="Create account" parent="Log in" />}>
        <AppText tone="textMuted">Start by entering a username on the log-in screen.</AppText>
        <Button label="Go to log in" onPress={() => router.replace("/login")} />
      </Screen>
    );
  }

  const strong = passwordMeetsRules(password);
  const matches = confirm.length > 0 && confirm === password;
  // Only judge the confirmation once it's as long as the password, so it isn't red from the first character.
  const confirmNote = !confirm
    ? undefined
    : matches
      ? "Passwords match"
      : confirm.length >= password.length
        ? "Passwords don't match"
        : undefined;

  function onContinue() {
    update({ password });
    router.push("/register/email");
  }

  return (
    <Screen header={<AppBar title="Create account" parent="Log in" step={registerStep("Password")} />} gap={space[6]}>
      <StepHeader icon="lock" title="Create a password">
        You’ll use it with your username to log in.
      </StepHeader>

      <UsernameRow username={draft.username} onChange={() => router.back()} />

      <View style={{ gap: space[3] }}>
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureToggle
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          passwordRules="minlength: 8; maxlength: 64; required: upper; required: lower; required: digit; required: special;"
          maxLength={PASSWORD_MAX_LENGTH}
          autoFocus
        />
        <PasswordChecklist password={password} />
      </View>

      <TextField
        label="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
        secureToggle
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        maxLength={PASSWORD_MAX_LENGTH}
        error={confirmNote && !matches ? confirmNote : undefined}
        helper={matches ? "Passwords match" : undefined}
        returnKeyType="next"
        onSubmitEditing={() => strong && matches && onContinue()}
      />

      <Button label="Continue" onPress={onContinue} disabled={!strong || !matches} />
    </Screen>
  );
}
