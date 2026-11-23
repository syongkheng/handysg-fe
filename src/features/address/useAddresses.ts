import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { authApi, type SavedAddress } from "@/api/auth";
import { useSession, useSessionActions } from "@/auth/SessionProvider";
import { authErrorMessage } from "@/features/auth/authErrors";

export type AddressesState = { status: "loading" } | { status: "done"; addresses: SavedAddress[] } | { status: "error"; message: string };

/**
 * The signed-in user's saved addresses, default first. Reloads whenever the screen comes into focus,
 * so an address added in the address form shows up on return. Guests get an empty list, no request.
 */
export function useAddresses(): AddressesState & { reload: () => void; replace: (addresses: SavedAddress[]) => void } {
  const signedIn = useSession().status === "signedIn";
  const { getAccessToken } = useSessionActions();
  const [state, setState] = useState<AddressesState>({ status: "loading" });

  const load = useCallback(() => {
    if (!signedIn) return;
    const controller = new AbortController();
    authApi
      .listAddresses(getAccessToken(), controller.signal)
      .then((addresses) => setState({ status: "done", addresses }))
      .catch((e) => {
        if (!controller.signal.aborted) setState({ status: "error", message: authErrorMessage(e) });
      });
    return () => controller.abort();
  }, [signedIn, getAccessToken]);

  useFocusEffect(load);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    load();
  }, [load]);
  const replace = useCallback((addresses: SavedAddress[]) => setState({ status: "done", addresses }), []);

  if (!signedIn) return { status: "done", addresses: [], reload, replace };
  return { ...state, reload, replace };
}
