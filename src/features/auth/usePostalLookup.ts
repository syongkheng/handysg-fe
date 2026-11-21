import { useEffect, useState } from "react";
import { authApi, type AddressLookup } from "@/api/auth";
import { POSTAL_CODE_PATTERN } from "./passwordRules";

export type LookupState = { status: "idle" } | { status: "loading" } | { status: "done"; result: AddressLookup } | { status: "error" };

/**
 * Looks up a Singapore postal code (OneMap, through our API) once all 6 digits are typed.
 * Typing again cancels the request in flight. Failures just mean "type the address yourself".
 */
export function usePostalLookup(postalCode: string): LookupState {
  const [answer, setAnswer] = useState<{ postalCode: string; state: LookupState } | null>(null);
  const complete = POSTAL_CODE_PATTERN.test(postalCode);

  useEffect(() => {
    if (!complete) return;
    const controller = new AbortController();
    authApi
      .lookupPostalCode(postalCode, controller.signal)
      .then((result) => setAnswer({ postalCode, state: { status: "done", result } }))
      .catch(() => {
        if (!controller.signal.aborted) setAnswer({ postalCode, state: { status: "error" } });
      });
    return () => controller.abort();
  }, [postalCode, complete]);

  if (!complete) return { status: "idle" };
  return answer?.postalCode === postalCode ? answer.state : { status: "loading" };
}
