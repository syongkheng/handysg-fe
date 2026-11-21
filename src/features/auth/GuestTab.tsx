import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { View } from "react-native";
import { AppText, Screen } from "@/components";
import { space } from "@/theme";
import { SignInPrompt } from "./SignInPrompt";

/** A tab's guest view: the tab title, a "Log in to …" card, optional extras below it, and an optional pinned footer. */
export function GuestTab({ title, reason, children, footer }: { title: string; reason: string; children?: ReactNode; footer?: ReactNode }) {
  const router = useRouter();
  return (
    <Screen edges={["top", "left", "right"]} footer={footer}>
      <View style={{ paddingTop: space[2] }}>
        <AppText variant="2xl" accessibilityRole="header">
          {title}
        </AppText>
      </View>
      <SignInPrompt
        title="You're browsing as a guest"
        reason={reason}
        onLogIn={() => router.push({ pathname: "/login", params: { reason } })}
      />
      {children}
    </Screen>
  );
}
