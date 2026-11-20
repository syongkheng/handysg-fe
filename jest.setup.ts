// Tests never read the real env files: give src/config/env.ts a fixed API URL.
process.env.EXPO_PUBLIC_API_URL = "http://api.test";
