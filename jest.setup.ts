// Tests never read the real env files: give src/config/env.ts a fixed API URL.
process.env.EXPO_PUBLIC_API_URL = "http://api.test";

// Secure storage is native-only: tests use an in-memory token store that starts empty.
jest.mock("@/auth/tokenStore", () => {
  let token: string | null = null;
  return {
    tokenStore: {
      get: jest.fn(async () => token),
      set: jest.fn(async (t: string) => {
        token = t;
      }),
      clear: jest.fn(async () => {
        token = null;
      }),
    },
  };
});
