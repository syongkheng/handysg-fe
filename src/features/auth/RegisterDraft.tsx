import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * What the customer has typed so far in sign-up, shared by the steps so Back keeps it.
 * Memory only: the password is never written to disk, and the draft is gone when the flow closes.
 */
export interface RegisterDraft {
  username: string;
  password: string;
  email: string;
}

const EMPTY: RegisterDraft = { username: "", password: "", email: "" };

interface DraftContext {
  draft: RegisterDraft;
  update: (patch: Partial<RegisterDraft>) => void;
  reset: (username?: string) => void;
}

const Ctx = createContext<DraftContext | null>(null);

export function RegisterDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<RegisterDraft>(EMPTY);
  const value = useMemo<DraftContext>(
    () => ({
      draft,
      update: (patch) => setDraft((d) => ({ ...d, ...patch })),
      reset: (username = "") => setDraft({ ...EMPTY, username }),
    }),
    [draft],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRegisterDraft(): DraftContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRegisterDraft must be used inside the (auth) layout");
  return ctx;
}

/**
 * Sign-up steps, for the progress bar in the App bar. The account is created at "Email", the
 * code proves the email, and the address is saved last, once the user is signed in.
 */
export const REGISTER_STEPS = ["Password", "Email", "Verify email", "Address"] as const;
export const registerStep = (name: (typeof REGISTER_STEPS)[number]) => ({
  current: REGISTER_STEPS.indexOf(name) + 1,
  total: REGISTER_STEPS.length,
});
