import { api } from "./client";

/** GET /connectivity. `color` is the backend's environment flag; `timestamp` is Singapore time. */
export interface Connectivity {
  status: "ok";
  color: string;
  timestamp: string;
}

export const getConnectivity = (signal?: AbortSignal) => api.get<Connectivity>("/connectivity", { signal });
