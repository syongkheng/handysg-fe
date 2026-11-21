import * as SecureStore from "expo-secure-store";

/**
 * Where the refresh token lives on iOS and Android: the Keychain / Keystore via expo-secure-store.
 * Readable only while the device is unlocked, and never copied to a new device from a backup.
 * The access token is short-lived and stays in memory only (SessionProvider).
 *
 * Web uses tokenStore.web.ts instead (memory only).
 */
const KEY = "handysg.refreshToken";
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export const tokenStore = {
  get: () => SecureStore.getItemAsync(KEY, OPTIONS),
  set: (refreshToken: string) => SecureStore.setItemAsync(KEY, refreshToken, OPTIONS),
  clear: () => SecureStore.deleteItemAsync(KEY, OPTIONS),
};
