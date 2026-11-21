import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useSession } from "@/auth/SessionProvider";
import { AppText, Button } from "@/components";

/** Account pages need a signed-in user; a guest (deep link, or signed out) gets a log-in prompt instead. */
export function SignedInOnly({ children }: { children: ReactNode }) {
  const session = useSession();
  const router = useRouter();
  if (session.status === "signedIn") return <>{children}</>;
  return (
    <>
      <AppText tone="textMuted">Log in to manage your account data.</AppText>
      <Button label="Log in" onPress={() => router.push({ pathname: "/login", params: { reason: "manage your account and addresses" } })} />
    </>
  );
}
