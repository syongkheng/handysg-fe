import { createContext, useContext, type ReactNode } from "react";

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

const GUEST: Session = { status: "guest" };
const SessionContext = createContext<Session>(GUEST);

/**
 * Everyone is a guest until the log-in work lands: that branch replaces the fixed value
 * here with real tokens from the /auth endpoints. `initialSession` is for tests.
 */
export function SessionProvider({ children, initialSession = GUEST }: { children: ReactNode; initialSession?: Session }) {
  return <SessionContext.Provider value={initialSession}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  return useContext(SessionContext);
}
