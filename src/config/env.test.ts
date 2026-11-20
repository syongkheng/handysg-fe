import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("accepts an http URL in development and strips trailing slashes", () => {
    expect(parseEnv({ EXPO_PUBLIC_API_URL: " http://localhost:3000// " }, true)).toEqual({ apiUrl: "http://localhost:3000", isDev: true });
  });

  it("accepts https in production", () => {
    expect(parseEnv({ EXPO_PUBLIC_API_URL: "https://api.handysg.sg" }, false).apiUrl).toBe("https://api.handysg.sg");
  });

  it.each([undefined, "", "   "])("rejects a missing value (%p) and names the key", (v) => {
    expect(() => parseEnv({ EXPO_PUBLIC_API_URL: v }, true)).toThrow(/EXPO_PUBLIC_API_URL is not set/);
  });

  it("rejects something that isn't a URL without echoing it back", () => {
    expect(() => parseEnv({ EXPO_PUBLIC_API_URL: "localhost-3000" }, true)).toThrow(/must be a full URL/);
    expect(() => parseEnv({ EXPO_PUBLIC_API_URL: "localhost-3000" }, true)).not.toThrow(/localhost-3000/);
  });

  it("rejects non-http schemes", () => {
    expect(() => parseEnv({ EXPO_PUBLIC_API_URL: "ftp://example.com" }, true)).toThrow(/http:\/\/ or https:\/\//);
  });

  it("refuses plain http in production builds", () => {
    expect(() => parseEnv({ EXPO_PUBLIC_API_URL: "http://api.handysg.sg" }, false)).toThrow(/https:\/\/ in production/);
  });
});
