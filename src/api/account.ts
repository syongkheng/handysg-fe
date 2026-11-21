import { api } from "./client";
import type { OtpChallenge } from "./auth";

/** "STORED": exactly as HandySG stores it (encrypted fields stay encrypted). "READABLE": encrypted fields decrypted. */
export type ExportFormat = "STORED" | "READABLE";

export interface ExportAccepted {
  requestId: string;
  format: ExportFormat;
  /** "t***@gmail.com" */
  sentTo: string;
}

/** The signed-in user's own data rights (backend/src/account). Every call needs the access token. */
export const accountApi = {
  requestExport: (format: ExportFormat, token: string | null) => api.post<ExportAccepted>("/account/export", { format }, { token }),
  startDeletion: (password: string, token: string | null) => api.post<OtpChallenge>("/account/delete/start", { password }, { token }),
  confirmDeletion: (challengeId: string, code: string, token: string | null) =>
    api.post<{ deleted: true }>("/account/delete/confirm", { challengeId, code }, { token }),
};
