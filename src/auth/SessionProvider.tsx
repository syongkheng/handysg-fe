import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { router } from "expo-router";
import { ApiError } from "@/api/ApiError";
import { authApi, type ApiUser, type AuthTokens } from "@/api/auth";
import { setSessionRecovery } from "@/api/client";
import { tokenStore } from "./tokenStore";

export type UserType = "CUSTOMER" | "TECHNICIAN" | "ADMIN";

export interface SessionUser {
  publicId: string;
  username: string;
  type: UserType;
}

/**
 * Who is using the app. Guests can browse the home screen; anything that creates or shows
 * personal data (booking a job, uploading a licence, jobs, wallet, profile) needs a signed-in user.
 */
export type Session = { status: "guest" } | { status: "signedIn"; user: SessionUser };

interface SessionActions {
  /** After the email code is verified: keep the tokens and switch to signed in. */
  signIn: (tokens: AuthTokens) => Promise<void>;
  /** Ends this device's session on the server (best effort) and forgets the tokens. */
  signOut: () => Promise<void>;
  /** The current access token, for authenticated API calls. Null when signed out. */
  getAccessToken: () => string | null;
}

const GUEST: Session = { status: "guest" };
const SessionContext = createContext<Session>(GUEST);
const noop = async () => {};
const ActionsContext = createContext<SessionActions>({ signIn: noop, signOut: noop, getAccessToken: () => null });

const toSessionUser = (u: ApiUser): SessionUser => ({ publicId: u.id, username: u.username, type: u.type });

/**
 * Holds the session. The refresh token is kept in secure storage (tokenStore); on launch it is
 * exchanged for a new access token, so the user stays signed in across restarts. The access
 * token lives only in memory. `initialSession` is for tests and skips the restore.
 */
export function SessionProvider({ children, initialSession }: { children: ReactNode; initialSession?: Session }) {
  const [session, setSession] = useState<Session>(initialSession ?? GUEST);
  const accessToken = useRef<string | null>(null);

  // Every access token issued during the current log-in (the first one plus each renewal). A late 401
  // is only retried if it was sent with one of these, never with a token from someone else's log-in.
  const ownTokens = useRef(new Set<string>());

  const apply = useCallback(async (tokens: AuthTokens, renewal = false) => {
    if (!renewal) ownTokens.current = new Set();
    ownTokens.current.add(tokens.accessToken);
    accessToken.current = tokens.accessToken;
    await tokenStore.set(tokens.refreshToken);
    setSession({ status: "signedIn", user: toSessionUser(tokens.user) });
  }, []);

  // Restore a previous session on launch. Any failure (expired, revoked, offline) leaves a guest.
  useEffect(() => {
    if (initialSession) return;
    let cancelled = false;
    (async () => {
      try {
        const saved = await tokenStore.get();
        if (!saved) return;
        const tokens = await authApi.refresh(saved);
        if (!cancelled) await apply(tokens);
      } catch {
        // An expired or revoked token can't be used again; a network failure just means "guest for now".
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialSession, apply]);

  // Renewing an expired access token (registered with the API client, which calls it on a 401).
  // Calls that expire together share one renewal: the server rotates the refresh token, so a second
  // concurrent refresh with the old one would be refused.
  const renewing = useRef<Promise<string | null> | null>(null);
  useEffect(() => {
    if (initialSession) return; // tests drive the session themselves
    const expire = async () => {
      accessToken.current = null;
      ownTokens.current = new Set();
      setSession(GUEST);
      await tokenStore.clear().catch(() => {});
      router.push({ pathname: "/login", params: { reason: "continue", expired: "1" } });
    };
    setSessionRecovery(async (rejected) => {
      // Already signed out (e.g. a late 401 after the session expired): log-in is already open.
      if (!accessToken.current) return null;
      // Another call already renewed it: use the new token, but only for a call from this same log-in.
      if (accessToken.current !== rejected) return ownTokens.current.has(rejected) ? accessToken.current : null;
      renewing.current ??= (async () => {
        try {
          const saved = await tokenStore.get();
          if (!saved) {
            await expire();
            return null;
          }
          const tokens = await authApi.refresh(saved);
          await apply(tokens, true);
          return tokens.accessToken;
        } catch (err) {
          // Refused (expired, revoked, account deleted or suspended): sign out and ask to log in.
          // Offline or a server error: stay signed in; the call shows its own error, try again later.
          if (err instanceof ApiError && err.httpStatus >= 400 && err.httpStatus < 500) await expire();
          return null;
        } finally {
          renewing.current = null;
        }
      })();
      return renewing.current;
    });
    return () => setSessionRecovery(null);
  }, [initialSession, apply]);

  const signOut = useCallback(async () => {
    const saved = await tokenStore.get().catch(() => null);
    accessToken.current = null;
    ownTokens.current = new Set();
    setSession(GUEST);
    await tokenStore.clear().catch(() => {});
    if (saved) await authApi.logout(saved).catch(() => {});
  }, []);

  const actions = useMemo<SessionActions>(() => ({ signIn: (tokens) => apply(tokens), signOut, getAccessToken: () => accessToken.current }), [apply, signOut]);

  return (
    <ActionsContext.Provider value={actions}>
      <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
    </ActionsContext.Provider>
  );
}

export function useSession(): Session {
  return useContext(SessionContext);
}

export function useSessionActions(): SessionActions {
  return useContext(ActionsContext);
}
