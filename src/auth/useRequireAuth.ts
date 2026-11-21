import { useRouter } from "expo-router";
import { useCallback } from "react";
import { useSession } from "./SessionProvider";

/**
 * Wraps an action that needs a signed-in user. Signed in: runs it. Guest: opens the log-in
 * screen, which tells them why ("Log in to book a plumber").
 *
 *   const requireAuth = useRequireAuth();
 *   onPress={() => requireAuth("book a plumber", () => router.push(...))}
 *
 * This only decides what the UI shows. The API checks the access token on every request anyway.
 */
export function useRequireAuth() {
  const session = useSession();
  const router = useRouter();

  return useCallback(
    (reason: string, action: () => void) => {
      if (session.status === "signedIn") {
        action();
        return;
      }
      router.push({ pathname: "/login", params: { reason } });
    },
    [session.status, router],
  );
}
