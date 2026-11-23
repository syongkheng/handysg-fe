import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useSession } from "@/auth/SessionProvider";
import { AppText, Button } from "@/components";

/**
 * Pages that need a signed-in user; a guest (deep link, or signed out) gets a log-in prompt instead.
 * `reason` finishes "Log in to …" (defaults to the account-data wording).
 */
export function SignedInOnly({ children, reason }: { children: ReactNode; reason?: string }) {
  const session = useSession();
  const router = useRouter();
  if (session.status === "signedIn") return <>{children}</>;
  return (
    <>
      <AppText tone="textMuted">{`Log in to ${reason ?? "manage your account data"}.`}</AppText>
      <Button label="Log in" onPress={() => router.push({ pathname: "/login", params: { reason: reason ?? "manage your account and addresses" } })} />
    </>
  );
}
