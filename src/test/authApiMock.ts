// Shared fixtures for route tests of the log-in / sign-up flow. The API itself is mocked per file
// with jest.mock("@/api/auth", ...) so nothing ever reaches the network.
import type { AuthTokens, OtpChallenge } from "@/api/auth";

export const challenge = (over: Partial<OtpChallenge> = {}): OtpChallenge => ({
  challengeId: "ch_login1",
  purpose: "LOGIN",
  sentTo: "t***@gmail.com",
  expiresInSeconds: 600,
  ...over,
});

export const tokens = (over: Partial<AuthTokens> = {}): AuthTokens => ({
  accessToken: "access-1",
  accessTokenExpiresIn: 900,
  refreshToken: "refresh-1",
  user: {
    id: "aZ3kP9qL",
    type: "CUSTOMER",
    username: "tan_ah_kow",
    email: "t***@gmail.com",
    emailVerified: true,
    status: "ACTIVE",
    createdAt: "2026-11-21T00:00:00.000Z",
  },
  ...over,
});

/** jest.mock factory body for @/api/auth: every call is a jest.fn the test sets up. */
export const authApiMockFactory = () => ({
  authApi: {
    identify: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    verifyOtp: jest.fn(),
    resendOtp: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    addAddress: jest.fn(),
    updateAddress: jest.fn(),
    // Home and Profile load saved addresses on every render; default to none (jest.clearAllMocks keeps this).
    listAddresses: jest.fn(() => Promise.resolve([])),
    setDefaultAddress: jest.fn(),
    lookupPostalCode: jest.fn(),
  },
});
