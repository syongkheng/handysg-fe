import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { jobsApi, type CustomerJob } from "@/api/jobs";
import { useSession, useSessionActions } from "@/auth/SessionProvider";
import { authErrorMessage } from "@/features/auth/authErrors";

export type MyJobsState = { status: "loading" } | { status: "done"; jobs: CustomerJob[] } | { status: "error"; message: string };

/**
 * The signed-in customer's jobs, newest first. Reloads whenever the screen comes into focus, so a
 * job posted from the booking screen shows up on return. Guests get an empty list without a request.
 */
export function useMyJobs(): MyJobsState & { reload: () => void } {
  const session = useSession();
  const { getAccessToken } = useSessionActions();
  const signedIn = session.status === "signedIn";
  const [state, setState] = useState<MyJobsState>({ status: "loading" });

  const load = useCallback(() => {
    if (!signedIn) return;
    const controller = new AbortController();
    jobsApi
      .list(getAccessToken(), controller.signal)
      .then((jobs) => setState({ status: "done", jobs }))
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

  if (!signedIn) return { status: "done", jobs: [], reload };
  return { ...state, reload };
}
