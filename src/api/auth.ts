import { api } from "./client";

/** Mirrors the backend's /auth and /address responses (backend/src/auth/Auth.service.ts). */
export type OtpPurpose = "VERIFY_EMAIL" | "LOGIN" | "DELETE_ACCOUNT";

export interface OtpChallenge {
  challengeId: string;
  purpose: OtpPurpose;
  /** "t***@gmail.com" */
  sentTo: string;
  expiresInSeconds: number;
}

export interface ApiUser {
  id: string;
  type: "CUSTOMER" | "TECHNICIAN" | "ADMIN";
  username: string;
  email: string;
  emailVerified: boolean;
  status: "PENDING" | "ACTIVE" | "SUSPENDED";
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  user: ApiUser;
}

/** A Singapore address. Floor and unit go together, or are both left out (landed property). */
export interface SgAddress {
  postalCode: string;
  line1: string;
  line2?: string;
  floor?: string;
  unit?: string;
}

export interface AddressMatch {
  line1: string;
  building?: string;
}

export interface AddressLookup {
  postalCode: string;
  matches: AddressMatch[];
  /** False when the lookup service couldn't be reached. */
  available: boolean;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export interface SavedAddress extends SgAddress {
  id: string;
  label: string;
  isDefault: boolean;
}

export const authApi = {
  identify: (username: string) => api.post<{ exists: boolean }>("/auth/identify", { username }),
  login: (username: string, password: string) => api.post<OtpChallenge>("/auth/login", { username, password }),
  register: (input: RegisterInput) => api.post<OtpChallenge>("/auth/register", input),
  verifyOtp: (challengeId: string, code: string) => api.post<AuthTokens>("/auth/otp/verify", { challengeId, code }),
  resendOtp: (challengeId: string) => api.post<OtpChallenge>("/auth/otp/resend", { challengeId }),
  refresh: (refreshToken: string) => api.post<AuthTokens>("/auth/refresh", { refreshToken }),
  logout: (refreshToken: string) => api.post<{ loggedOut: true }>("/auth/logout", { refreshToken }),
  addAddress: (address: SgAddress, token: string | null) => api.post<SavedAddress>("/address", { address }, { token }),
  listAddresses: (token: string | null) => api.get<SavedAddress[]>("/address", { token }),
  lookupPostalCode: (postalCode: string, signal?: AbortSignal) =>
    api.get<AddressLookup>(`/address/lookup/${encodeURIComponent(postalCode)}`, { signal, timeoutMs: 6000 }),
};
