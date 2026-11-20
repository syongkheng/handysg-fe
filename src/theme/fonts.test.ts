import { fontAssets, fontFamily, type FontWeight } from "./fonts";

describe("fontFamily", () => {
  it.each<[FontWeight, string]>([
    [400, "Inter_400Regular"],
    [500, "Inter_500Medium"],
    [600, "Inter_600SemiBold"],
    [700, "Inter_700Bold"],
  ])("maps weight %d to the %s family", (weight, family) => {
    expect(fontFamily(weight)).toBe(family);
  });

  it("only returns families that are loaded by useFonts", () => {
    for (const w of [400, 500, 600, 700] as const) {
      expect(Object.keys(fontAssets)).toContain(fontFamily(w));
    }
    expect(Object.keys(fontAssets)).toHaveLength(4);
  });
});
