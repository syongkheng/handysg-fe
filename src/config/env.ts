/**
 * The only file that reads process.env. Everything else imports `env` from here.
 *
 * Values come from .env.development (expo start) or .env.production (expo export / EAS),
 * which Expo loads and bakes into the bundle. Keys are listed in env.example.
 * Only EXPO_PUBLIC_* keys reach the app, and they are readable by anyone who has it: never put a secret here.
 *
 * Expo only inlines the literal form `process.env.EXPO_PUBLIC_X`, so each key is read by name below.
 */

export interface AppEnv {
  /** e.g. "http://localhost:3000" or "https://api.handysg.sg". No trailing slash. */
  apiUrl: string;
  isDev: boolean;
}

export function parseEnv(raw: { EXPO_PUBLIC_API_URL?: string }, isDev: boolean): AppEnv {
  const value = raw.EXPO_PUBLIC_API_URL?.trim();
  if (!value) {
    throw new Error(
      "EXPO_PUBLIC_API_URL is not set. Add it to .env.development (see env.example), then restart `npm start`.",
    );
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`EXPO_PUBLIC_API_URL must be a full URL like http://localhost:3000 (got something else).`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("EXPO_PUBLIC_API_URL must start with http:// or https://.");
  }
  // Release builds talk to the real API, which is HTTPS only.
  if (!isDev && url.protocol !== "https:") {
    throw new Error("EXPO_PUBLIC_API_URL must use https:// in production builds.");
  }

  return { apiUrl: value.replace(/\/+$/, ""), isDev };
}

export const env: AppEnv = parseEnv({ EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL }, __DEV__);
