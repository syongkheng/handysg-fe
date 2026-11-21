/**
 * Web: the refresh token is kept in memory only, never in localStorage, where any script on the
 * page could read it. Reloading the page means logging in again; the web build is mainly the
 * landing page, so that trade-off is fine for now.
 */
let token: string | null = null;

export const tokenStore = {
  get: async () => token,
  set: async (refreshToken: string) => {
    token = refreshToken;
  },
  clear: async () => {
    token = null;
  },
};
