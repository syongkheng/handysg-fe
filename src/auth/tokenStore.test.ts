// jest.setup.ts mocks @/auth/tokenStore for every other test; these load the real modules.
import * as SecureStore from "expo-secure-store";

jest.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
  getItemAsync: jest.fn(async () => "saved"),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));

describe("tokenStore (native)", () => {
  const { tokenStore } = jest.requireActual<typeof import("./tokenStore")>("./tokenStore");
  const opts = { keychainAccessible: "WHEN_UNLOCKED_THIS_DEVICE_ONLY" };

  it("keeps the refresh token in secure storage, readable only while unlocked on this device", async () => {
    await expect(tokenStore.get()).resolves.toBe("saved");
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith("handysg.refreshToken", opts);
    await tokenStore.set("r1");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("handysg.refreshToken", "r1", opts);
    await tokenStore.clear();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("handysg.refreshToken", opts);
  });
});

describe("tokenStore (web)", () => {
  const { tokenStore } = jest.requireActual<typeof import("./tokenStore.web")>("./tokenStore.web");

  it("keeps the token in memory only: empty, set, cleared", async () => {
    await expect(tokenStore.get()).resolves.toBeNull();
    await tokenStore.set("r1");
    await expect(tokenStore.get()).resolves.toBe("r1");
    await tokenStore.clear();
    await expect(tokenStore.get()).resolves.toBeNull();
  });
});
